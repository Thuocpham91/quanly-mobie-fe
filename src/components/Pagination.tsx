import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange, totalItems }) => {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  // For many pages, we might want to implement windowing (e.g. 1 2 ... 5 6 7 ... 10)
  // But for now, we'll display a simple list if pages < 10, or just standard controls
  const visiblePages = pages.filter(p => p === 1 || p === totalPages || Math.abs(currentPage - p) <= 2);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '1rem 1.5rem',
      borderTop: '1px solid var(--border)',
      backgroundColor: '#f8fafc'
    }}>
      <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
        {totalItems !== undefined ? `Total: ${totalItems} items` : `Page ${currentPage} of ${totalPages}`}
      </div>
      
      <div style={{ display: 'flex', gap: '0.25rem' }}>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          style={{
            padding: '0.5rem',
            borderRadius: '0.375rem',
            backgroundColor: 'transparent',
            border: '1px solid var(--border)',
            color: currentPage === 1 ? '#cbd5e1' : '#64748b',
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <ChevronLeft size={16} />
        </button>

        {pages.map(page => {
          if (!visiblePages.includes(page)) {
            if (page === 2 || page === totalPages - 1) {
              return <span key={page} style={{ padding: '0.5rem', color: '#94a3b8' }}>...</span>;
            }
            return null;
          }
          
          return (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              style={{
                padding: '0.5rem 0.875rem',
                borderRadius: '0.375rem',
                backgroundColor: currentPage === page ? 'var(--primary)' : 'transparent',
                color: currentPage === page ? 'white' : '#64748b',
                border: currentPage === page ? 'none' : '1px solid var(--border)',
                cursor: 'pointer',
                fontWeight: currentPage === page ? '600' : '400',
              }}
            >
              {page}
            </button>
          );
        })}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          style={{
            padding: '0.5rem',
            borderRadius: '0.375rem',
            backgroundColor: 'transparent',
            border: '1px solid var(--border)',
            color: currentPage === totalPages ? '#cbd5e1' : '#64748b',
            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
