import React from 'react';
import ApiKeyForm from '@/components/auth/ApiKeyForm';

const AuthPage: React.FC = () => {
  return (
    <main style={{ width: '100%' }}>
      <ApiKeyForm />
    </main>
  );
};

export default AuthPage;
