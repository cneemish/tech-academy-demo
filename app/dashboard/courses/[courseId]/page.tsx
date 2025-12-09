"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Layout from "@/components/Layout";
import JSONRTEContent from "@/components/JSONRTEContent";

// Force dynamic rendering - this page requires client-side features
export const dynamic = "force-dynamic";

export default function CourseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params?.courseId as string; // This can be either UID or URL slug
  const [user, setUser] = useState<any>(null);
  const [course, setCourse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [courseProgress, setCourseProgress] = useState<any>(null);
  const [isMarkingComplete, setIsMarkingComplete] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
      router.push("/");
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    fetchCourse();

    // Auto-refresh course data every 30 seconds to detect new modules
    const refreshInterval = setInterval(() => {
      fetchCourse(true); // Silent refresh
    }, 30000); // 30 seconds

    // Also refresh when page becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchCourse(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(refreshInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, router]);

  const fetchCourse = async (silent = false) => {
    try {
      if (!silent) {
        setIsLoading(true);
      }
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const response = await fetch(`/api/courses/${courseId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success && data.course) {
        const newCourse = data.course;
        const previousModuleCount = course?.course_modules?.length || 0;
        const newModuleCount = newCourse.course_modules?.length || 0;

        // Update course data
        setCourse(newCourse);

        // Always fetch progress with current module count to ensure accurate calculation
        // This handles cases where modules are added, removed, or the count changes
        if (newModuleCount > 0) {
          if (
            newModuleCount !== previousModuleCount &&
            previousModuleCount > 0
          ) {
            console.log(
              `Module count changed! Previous: ${previousModuleCount}, New: ${newModuleCount}`
            );
          }
          // Always pass current module count to recalculate progress accurately
          fetchCourseProgress(newCourse.uid || courseId, newModuleCount);
        } else {
          // No modules yet, fetch progress without module count
          fetchCourseProgress(newCourse.uid || courseId);
        }
      }
    } catch (error) {
      console.error("Error fetching course:", error);
      // Don't crash - just log the error
      // The UI will continue to show existing course data
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  };

  const fetchCourseProgress = async (
    courseUid: string,
    currentModuleCount?: number
  ) => {
    try {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const response = await fetch(`/api/courses/${courseUid}/progress`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        let progressData = data.progress;

        // Always recalculate progress percentage based on current module count
        // This ensures accuracy when modules are added or removed
        if (currentModuleCount && currentModuleCount > 0) {
          const completedCount = progressData.completedModules?.length || 0;
          // Recalculate progress: completed modules / total modules * 100
          const newProgress = Math.round(
            (completedCount / currentModuleCount) * 100
          );
          progressData = {
            ...progressData,
            progress: Math.min(Math.max(newProgress, 0), 100), // Clamp between 0 and 100
            // If course was marked as completed but new modules were added, unmark it
            // Only mark as completed if all current modules are done
            completedAt:
              completedCount >= currentModuleCount && currentModuleCount > 0
                ? new Date()
                : null,
          };
        } else {
          // If no modules, progress should be 0
          progressData = {
            ...progressData,
            progress: 0,
            completedAt: null,
          };
        }

        setCourseProgress(progressData);
        // If user has a current module, set it as active
        if (progressData.currentModule && !activeModule) {
          setActiveModule(progressData.currentModule);
        }
      }
    } catch (error) {
      console.error("Error fetching course progress:", error);
      // Don't crash - just log the error
    }
  };

  const markModuleComplete = async (moduleUid: string) => {
    try {
      setIsMarkingComplete(true);
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;
      // Always use current module count to ensure progress is calculated correctly
      // even if new modules were added since page load
      const totalModules = modules.length;

      if (totalModules === 0) {
        console.warn("No modules found in course");
        setIsMarkingComplete(false);
        return;
      }

      const response = await fetch(`/api/courses/${courseId}/progress`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          moduleUid,
          totalModules,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setCourseProgress(data.progress);

        // Move to next module
        // Re-fetch modules to ensure we have the latest list (in case new modules were added)
        const currentModules = modules; // Use current modules list
        const currentIndex = currentModules.findIndex(
          (m: any) => m.uid === moduleUid
        );

        if (currentIndex < currentModules.length - 1) {
          const nextModule = currentModules[currentIndex + 1];
          setActiveModule(nextModule.uid);
        } else {
          // Check if there are more modules by refreshing course data
          // This handles the case where new modules were added while user was completing
          fetchCourse(true).then(() => {
            // After refresh, check if there are more modules
            const updatedModules = course?.course_modules || [];
            if (updatedModules.length > currentModules.length) {
              // New modules were added, set first new module as active
              const sortedModules = [...updatedModules].sort(
                (a: any, b: any) => {
                  const numA = Number(a.module_number) || 0;
                  const numB = Number(b.module_number) || 0;
                  return numA - numB;
                }
              );
              const nextNewModule = sortedModules.find(
                (m: any) => !data.progress.completedModules?.includes(m.uid)
              );
              if (nextNewModule) {
                setActiveModule(nextNewModule.uid);
              } else {
                setActiveModule(null);
              }
            } else {
              // All current modules completed
              setActiveModule(null);
            }
          });
        }
      } else {
        throw new Error(data.error || "Failed to mark module as complete");
      }
    } catch (error) {
      console.error("Error marking module as complete:", error);
      // Show user-friendly error message instead of crashing
      alert("Failed to mark module as complete. Please try again.");
    } finally {
      setIsMarkingComplete(false);
    }
  };

  // Sort modules by module_number in ascending order
  // This must be computed before any conditional returns to follow React hooks rules
  const modules = (course?.course_modules || [])
    .map((module: any) => ({
      ...module,
      module_number: module.module_number || module.moduleNumber || 0,
    }))
    .sort((a: any, b: any) => {
      const numA = Number(a.module_number) || 0;
      const numB = Number(b.module_number) || 0;
      return numA - numB;
    });

  // Calculate progress dynamically based on current module count
  // This ensures progress updates correctly when new modules are added
  const completedModules = courseProgress?.completedModules?.length || 0;
  const currentModuleCount = modules.length;

  // Always recalculate progress based on current module count
  // This ensures accuracy when modules are added or removed
  let progress = 0;
  if (currentModuleCount > 0) {
    // Calculate progress: completed modules / total modules * 100
    progress = Math.round((completedModules / currentModuleCount) * 100);
    // Ensure progress doesn't exceed 100%
    progress = Math.min(progress, 100);
    // Ensure progress doesn't go below 0%
    progress = Math.max(progress, 0);
  }

  if (!user) {
    return <div>Loading...</div>;
  }

  if (isLoading) {
    return (
      <Layout user={user} activePage="courses">
        <div style={{ textAlign: "center", padding: "60px", color: "#6b7280" }}>
          Loading course...
        </div>
      </Layout>
    );
  }

  if (!course) {
    return (
      <Layout user={user} activePage="courses">
        <div
          style={{
            background: "white",
            borderRadius: "12px",
            padding: "60px",
            textAlign: "center",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
          }}
        >
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>❌</div>
          <div
            style={{
              fontSize: "18px",
              fontWeight: "500",
              color: "#1f2937",
              marginBottom: "8px",
            }}
          >
            Course not found
          </div>
          <button
            onClick={() => router.push("/dashboard/courses")}
            style={{
              marginTop: "16px",
              padding: "12px 24px",
              background: "#6366f1",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
            }}
          >
            Back to Courses
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user} activePage="courses">
      <div
        style={{
          display: "flex",
          gap: "24px",
          maxWidth: "1400px",
          margin: "0 auto",
        }}
      >
        {/* Left Sidebar - Course Navigation */}
        <aside
          style={{
            width: "320px",
            background: "white",
            borderRadius: "12px",
            padding: "24px",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            height: "fit-content",
            position: "sticky",
            top: "24px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "24px",
            }}
          >
            <h3
              style={{
                fontSize: "18px",
                fontWeight: "600",
                color: "#1f2937",
              }}
            >
              {course.title || course.course_title || "Course"}
            </h3>
            <button
              onClick={() => router.push("/dashboard/courses")}
              style={{
                background: "transparent",
                border: "none",
                fontSize: "20px",
                cursor: "pointer",
                color: "#6b7280",
              }}
            >
              ×
            </button>
          </div>

          {/* Progress */}
          <div
            style={{
              marginBottom: "24px",
              paddingBottom: "24px",
              borderBottom: "1px solid #e5e7eb",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "8px",
              }}
            >
              <span style={{ fontSize: "14px", color: "#6b7280" }}>
                Progress
              </span>
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#6366f1",
                }}
              >
                {progress}%
              </span>
            </div>
            <div
              style={{
                width: "100%",
                height: "8px",
                background: "#e5e7eb",
                borderRadius: "4px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: "100%",
                  background:
                    "linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%)",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
            <div
              style={{ fontSize: "12px", color: "#9ca3af", marginTop: "8px" }}
            >
              {completedModules} of {modules.length} modules completed
            </div>
          </div>

          {/* Modules List */}
          <div>
            <h4
              style={{
                fontSize: "14px",
                fontWeight: "600",
                color: "#374151",
                marginBottom: "16px",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Course Modules
            </h4>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              {modules.map((module: any, index: number) => {
                const isCompleted =
                  courseProgress?.completedModules?.includes(module.uid) ||
                  false;
                const isActive = activeModule === module.uid;
                const moduleNumber = module.module_number || index + 1;

                return (
                  <div
                    key={module.uid}
                    onClick={() => setActiveModule(module.uid)}
                    style={{
                      padding: "12px",
                      background: isActive ? "#f3f4f6" : "transparent",
                      borderRadius: "8px",
                      cursor: "pointer",
                      border: isActive
                        ? "2px solid #6366f1"
                        : "1px solid #e5e7eb",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = "#f9fafb";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = "transparent";
                      }
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <div
                        style={{
                          width: "24px",
                          height: "24px",
                          borderRadius: "50%",
                          background: isCompleted
                            ? "#10b981"
                            : isActive
                            ? "#6366f1"
                            : "#e5e7eb",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: isCompleted || isActive ? "white" : "#6b7280",
                          fontSize: "12px",
                          fontWeight: "600",
                          flexShrink: 0,
                        }}
                      >
                        {isCompleted ? "✓" : moduleNumber}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: "14px",
                            fontWeight: isActive ? "600" : "500",
                            color: "#1f2937",
                            marginBottom: "2px",
                          }}
                        >
                          {module.title ||
                            module.module_title ||
                            `Module ${moduleNumber}`}
                        </div>
                        {module.duration && (
                          <div style={{ fontSize: "12px", color: "#9ca3af" }}>
                            {module.duration} min
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main style={{ flex: 1 }}>
          {/* Course Header */}
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              padding: "32px",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
              marginBottom: "24px",
            }}
          >
            <h1
              style={{
                fontSize: "32px",
                fontWeight: "bold",
                color: "#1f2937",
                marginBottom: "12px",
              }}
            >
              {course.title || course.course_title || "Course Title"}
            </h1>
            {(course.description || course.course_description) && (
              <p
                style={{
                  fontSize: "16px",
                  color: "#6b7280",
                  marginBottom: "24px",
                  lineHeight: "1.6",
                }}
              >
                {course.description || course.course_description}
              </p>
            )}

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: "12px" }}>
              {!activeModule && (
                <button
                  onClick={() => {
                    if (modules.length > 0) {
                      // Start with module 1 (first module in sorted order)
                      const firstModule =
                        modules.find(
                          (m: any) => Number(m.module_number) === 1
                        ) || modules[0];
                      setActiveModule(firstModule.uid);
                    }
                  }}
                  style={{
                    padding: "14px 28px",
                    background: "#6366f1",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "16px",
                    fontWeight: "500",
                    cursor: "pointer",
                    transition: "background 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#4f46e5";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#6366f1";
                  }}
                >
                  Start Course
                </button>
              )}
              {activeModule && (
                <button
                  onClick={() => {
                    const currentIndex = modules.findIndex(
                      (m: any) => m.uid === activeModule
                    );
                    const isModuleCompleted =
                      courseProgress?.completedModules?.includes(
                        activeModule
                      ) || false;

                    if (!isModuleCompleted) {
                      // Mark current module as complete
                      markModuleComplete(activeModule);
                    } else if (currentIndex < modules.length - 1) {
                      // Move to next module
                      setActiveModule(modules[currentIndex + 1].uid);
                    }
                  }}
                  disabled={isMarkingComplete}
                  style={{
                    padding: "14px 28px",
                    background: isMarkingComplete ? "#9ca3af" : "#10b981",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "16px",
                    fontWeight: "500",
                    cursor: isMarkingComplete ? "not-allowed" : "pointer",
                    transition: "background 0.2s",
                    opacity: isMarkingComplete ? 0.7 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!isMarkingComplete) {
                      e.currentTarget.style.background = "#059669";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isMarkingComplete) {
                      e.currentTarget.style.background = "#10b981";
                    }
                  }}
                >
                  {isMarkingComplete
                    ? "Marking as complete..."
                    : courseProgress?.completedModules?.includes(activeModule)
                    ? "Go to next item →"
                    : "Mark as complete & Next →"}
                </button>
              )}
            </div>
          </div>

          {/* Module Content */}
          {activeModule ? (
            <div
              style={{
                background: "white",
                borderRadius: "12px",
                padding: "32px",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
              }}
            >
              {(() => {
                const activeModuleData = modules.find(
                  (m: any) => m.uid === activeModule
                );
                if (!activeModuleData) return null;

                const moduleGroup = activeModuleData.course_module_group;
                const lectureTitle = moduleGroup?.title_of_lecture;
                const lectureDetails = moduleGroup?.lecture_deatils; // JSON RTE field
                const courseVideo = activeModuleData.course_video;
                const moduleTitle =
                  activeModuleData.title ||
                  activeModuleData.module_title ||
                  "Module";
                const moduleDescription =
                  activeModuleData.description ||
                  activeModuleData.module_description ||
                  "";

                return (
                  <>
                    <h2
                      style={{
                        fontSize: "28px",
                        fontWeight: "600",
                        color: "#1f2937",
                        marginBottom: "24px",
                      }}
                    >
                      {lectureTitle ||
                        activeModuleData.title ||
                        activeModuleData.module_title ||
                        "Module"}
                    </h2>

                    {/* Course Video/Image */}
                    {courseVideo && (
                      <div style={{ marginBottom: "32px" }}>
                        {(() => {
                          const videoUrl =
                            courseVideo.url ||
                            (typeof courseVideo === "string"
                              ? courseVideo
                              : null);
                          const contentType =
                            courseVideo.content_type || courseVideo.contentType;

                          if (!videoUrl) return null;

                          if (
                            contentType?.startsWith("image/") ||
                            videoUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)
                          ) {
                            return (
                              <img
                                src={videoUrl}
                                alt={lectureTitle || "Course content"}
                                style={{
                                  width: "100%",
                                  maxHeight: "500px",
                                  objectFit: "contain",
                                  borderRadius: "8px",
                                  marginBottom: "24px",
                                }}
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = "none";
                                }}
                              />
                            );
                          } else if (
                            contentType?.startsWith("audio/") ||
                            videoUrl.match(/\.(mp3|wav|ogg)$/i)
                          ) {
                            return (
                              <div style={{ marginBottom: "24px" }}>
                                <audio controls style={{ width: "100%" }}>
                                  <source
                                    src={videoUrl}
                                    type={contentType || "audio/mpeg"}
                                  />
                                  Your browser does not support the audio
                                  element.
                                </audio>
                              </div>
                            );
                          } else {
                            return (
                              <div style={{ marginBottom: "24px" }}>
                                <a
                                  href={videoUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    display: "inline-block",
                                    padding: "12px 24px",
                                    background: "#6366f1",
                                    color: "white",
                                    textDecoration: "none",
                                    borderRadius: "8px",
                                    fontWeight: "500",
                                  }}
                                >
                                  Download/View File
                                </a>
                              </div>
                            );
                          }
                        })()}
                      </div>
                    )}

                    {/* Course Module Content - JSON RTE */}
                    {lectureDetails && (
                      <div style={{ marginBottom: "32px" }}>
                        <JSONRTEContent
                          jsonRteData={lectureDetails}
                          style={{
                            fontSize: "16px",
                            color: "#374151",
                            lineHeight: "1.8",
                          }}
                        />
                      </div>
                    )}

                    {/* Fallback content if no JSON RTE */}
                    {!lectureDetails &&
                      (activeModuleData.description ||
                        activeModuleData.module_description) && (
                        <div
                          style={{
                            fontSize: "16px",
                            color: "#374151",
                            lineHeight: "1.8",
                            marginBottom: "24px",
                          }}
                          dangerouslySetInnerHTML={{
                            __html:
                              activeModuleData.description ||
                              activeModuleData.module_description,
                          }}
                        />
                      )}
                    {!lectureDetails &&
                      (activeModuleData.content ||
                        activeModuleData.module_content) && (
                        <div
                          style={{
                            fontSize: "16px",
                            color: "#374151",
                            lineHeight: "1.8",
                          }}
                          dangerouslySetInnerHTML={{
                            __html:
                              activeModuleData.content ||
                              activeModuleData.module_content,
                          }}
                        />
                      )}
                  </>
                );
              })()}
            </div>
          ) : (
            <div
              style={{
                background: "white",
                borderRadius: "12px",
                padding: "60px",
                textAlign: "center",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
              }}
            >
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>📖</div>
              <div
                style={{
                  fontSize: "18px",
                  fontWeight: "500",
                  color: "#1f2937",
                  marginBottom: "8px",
                }}
              >
                Select a module to begin
              </div>
              <div style={{ fontSize: "14px", color: "#6b7280" }}>
                Choose a module from the sidebar to view its content
              </div>
            </div>
          )}
        </main>
      </div>
    </Layout>
  );
}
