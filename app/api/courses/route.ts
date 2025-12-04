import { NextRequest, NextResponse } from 'next/server';
import Stack from '@/lib/contentstack';
import { roleMiddleware, AuthenticatedRequest } from '@/lib/middleware';
import { detectTaxonomyFieldName, COMMON_TAXONOMY_FIELD_NAMES } from '@/lib/taxonomy-helper';
import connectDB from '@/lib/mongodb';
import TrainingPlan from '@/models/TrainingPlan';

// Get all courses
async function handleGet(req: AuthenticatedRequest) {
  try {
    const user = req.user;
    const userRole = user?.role;
    
    // For trainees, only show courses assigned via training plans
    let assignedCourseIds: string[] = [];
    if (userRole === 'trainee' && user?.userId) {
      await connectDB();
      const trainingPlans = await TrainingPlan.find({
        traineeId: user.userId,
        courseId: { $exists: true, $ne: '' }, // Only plans with courseId
      }).select('courseId').lean();
      
      assignedCourseIds = trainingPlans
        .map((plan: any) => plan.courseId)
        .filter((id: string) => id && id.trim() !== '');
      
      console.log(`Trainee ${user.userId} has ${assignedCourseIds.length} assigned courses:`, assignedCourseIds);
      
      // If trainee has no assigned courses, return empty array
      if (assignedCourseIds.length === 0) {
        return NextResponse.json(
          {
            success: true,
            courses: [],
            count: 0,
            message: 'No courses assigned. Please contact your trainer to assign courses.',
          },
          { status: 200 }
        );
      }
    }
    
    const Query = Stack.ContentType('course').Query();

    // Get query parameters for search and filters
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const taxonomyTerm = searchParams.get('taxonomy'); // This should be a term UID

    // Add search query if provided
    if (search) {
      Query.search(search);
    }

    // Fetch all published courses from Contentstack
    // Note: We don't include references here to avoid errors if the reference field doesn't exist
    // Modules will be fetched separately when a course is selected
    const result = await Query.toJSON().find();
    
    console.log('Contentstack courses query result:', {
      entriesCount: result[0]?.length || 0,
      hasEntries: Array.isArray(result[0]) && result[0].length > 0,
      resultType: typeof result,
      isArray: Array.isArray(result),
    });

    // Filter by taxonomy if provided (client-side filtering)
    // According to Contentstack docs: https://www.contentstack.com/docs/developers/taxonomy
    // Taxonomy field in course content type is "taxonomies" (uid: "taxonomies")
    // Contentstack taxonomy fields store term UIDs in an array
    // We filter client-side to check if the taxonomy array contains the term UID
    // This approach works reliably regardless of SDK query limitations
    let filteredCourses = result[0] || [];
    
    // For trainees, filter to only show assigned courses
    if (userRole === 'trainee' && assignedCourseIds.length > 0) {
      filteredCourses = filteredCourses.filter((course: any) => {
        const courseUid = course.uid;
        return assignedCourseIds.includes(courseUid);
      });
      console.log(`Filtered to ${filteredCourses.length} assigned courses for trainee`);
    }
    
    if (taxonomyTerm) {
      filteredCourses = filteredCourses.filter((course: any) => {
        const taxonomyField = course.taxonomies || course.categories || course.taxonomy || course.category;
        if (!taxonomyField) return false;
        
        // Handle array of taxonomy terms
        if (Array.isArray(taxonomyField)) {
          return taxonomyField.some((term: any) => {
            // Check if term UID matches
            const termUid = typeof term === 'string' ? term : (term?.uid || term?.term_uid || term?.id);
            return termUid === taxonomyTerm;
          });
        }
        
        // Handle single taxonomy term object
        if (typeof taxonomyField === 'object') {
          const termUid = taxonomyField.uid || taxonomyField.term_uid || taxonomyField.id;
          return termUid === taxonomyTerm;
        }
        
        return false;
      });
    }

    // Map courses to ensure consistent field names
    const mappedCourses = filteredCourses.map((course: any) => {
      // Detect taxonomy field name
      const taxonomyFieldName = detectTaxonomyFieldName(course);
      const taxonomyValue = taxonomyFieldName ? course[taxonomyFieldName] : null;
      
      // Map title - check multiple possible field names
      let courseTitle = course.title;
      if (!courseTitle) {
        // Try other common field names
        courseTitle = course.course_title || course.name || course.course_name;
      }
      // If still no title, check if it's in a nested structure
      if (!courseTitle && course.course_details) {
        courseTitle = course.course_details.title || course.course_details.course_title;
      }
      
      // Extract taxonomy terms - handle both array and object formats
      let taxonomyTerms: any[] = [];
      if (taxonomyValue) {
        if (Array.isArray(taxonomyValue)) {
          taxonomyTerms = taxonomyValue.map((term: any) => {
            if (typeof term === 'string') {
              return { uid: term, name: term };
            }
            return {
              uid: term.uid || term.term_uid || term.id || '',
              name: term.name || term.title || term.label || '',
            };
          });
        } else if (typeof taxonomyValue === 'object') {
          taxonomyTerms = [{
            uid: taxonomyValue.uid || taxonomyValue.term_uid || taxonomyValue.id || '',
            name: taxonomyValue.name || taxonomyValue.title || taxonomyValue.label || '',
          }];
        }
      }
      
      return {
        ...course,
        title: courseTitle || 'Untitled Course',
        description: course.description || course.course_description || course.details || '',
        // Include taxonomy information - use the "taxonomies" field from content type
        taxonomy: taxonomyTerms.length > 0 
          ? taxonomyTerms 
          : (course.taxonomies || course.categories || course.taxonomy || course.category || []),
        taxonomyFieldName: taxonomyFieldName || 'taxonomies', // Store for reference
        // Include course thumbnail if available
        course_thumbnail: course.course_thumbnail || null,
        // Modules will be fetched separately when course is selected
        // This avoids errors if course_modules reference field doesn't exist or has different name
        course_modules: [],
      };
    });

    console.log('Mapped courses:', {
      count: mappedCourses.length,
      courses: mappedCourses.map((c: any) => ({ uid: c.uid, title: c.title })),
    });

    return NextResponse.json(
      {
        success: true,
        courses: mappedCourses,
        count: mappedCourses.length,
        message: mappedCourses.length === 0 
          ? 'No courses found. Please create and publish courses in Contentstack.' 
          : `${mappedCourses.length} course(s) found`,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Get courses error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch courses',
        details: error.message,
        hint: 'Please check Contentstack configuration and ensure courses are published in the "prod" environment'
      },
      { status: 500 }
    );
  }
}

export const GET = roleMiddleware(['superadmin', 'admin', 'trainee'], handleGet);

