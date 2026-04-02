import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import '../../styles/docs-markdown.scss';

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => (
  <div className="docs-markdown">
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ href, children }) => (
          <a
            href={href}
            target={href?.startsWith('#') ? undefined : '_blank'}
            rel={href?.startsWith('#') ? undefined : 'noopener noreferrer'}
          >
            {children}
          </a>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  </div>
);

export default MarkdownRenderer;
