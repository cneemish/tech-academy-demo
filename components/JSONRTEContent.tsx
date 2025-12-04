'use client';

import { jsonToHtml } from '@contentstack/json-rte-serializer';

interface JSONRTEContentProps {
  jsonRteData: any;
  className?: string;
  style?: React.CSSProperties;
}

export default function JSONRTEContent({ jsonRteData, className, style }: JSONRTEContentProps) {
  if (!jsonRteData) {
    return null;
  }

  try {
    // Convert JSON RTE to HTML using the serializer
    const htmlContent = jsonToHtml(jsonRteData);

    return (
      <div
        className={`json-rte-content ${className || ''}`}
        style={{
          ...style,
          lineHeight: '1.8',
        }}
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    );
  } catch (error) {
    console.error('Error rendering JSON RTE content:', error);
    return (
      <div style={{ color: '#ef4444', padding: '16px', background: '#fee2e2', borderRadius: '8px' }}>
        Error rendering content. Please check the console for details.
      </div>
    );
  }
}

