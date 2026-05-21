import React, { createContext, useContext, useState, useEffect } from 'react';

interface BranchContextType {
  selectedBranchId: string;
  setSelectedBranchId: (id: string) => void;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export const BranchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');

  // Try to load from localStorage on mount
  useEffect(() => {
    const savedBranch = localStorage.getItem('selectedBranchId');
    if (savedBranch) {
      setSelectedBranchId(savedBranch);
    }
  }, []);

  // Save to localStorage when changed
  useEffect(() => {
    if (selectedBranchId) {
      localStorage.setItem('selectedBranchId', selectedBranchId);
    } else {
      localStorage.removeItem('selectedBranchId');
    }
  }, [selectedBranchId]);

  return (
    <BranchContext.Provider value={{ selectedBranchId, setSelectedBranchId }}>
      {children}
    </BranchContext.Provider>
  );
};

export const useBranchContext = () => {
  const context = useContext(BranchContext);
  if (context === undefined) {
    throw new Error('useBranchContext must be used within a BranchProvider');
  }
  return context;
};
