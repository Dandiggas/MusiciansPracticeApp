"use client";

import React from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";

const LogoutButton: React.FC = () => {
  const router = useRouter();

  const handleLogout = async () => {
    const token = localStorage.getItem('token');
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

    if (token) {
      try {
        await axios.post(`${apiBaseUrl}/logout/`, null, {
          headers: { Authorization: `Token ${token}` }
        });
        localStorage.removeItem('token');
        router.push('/login');
      } catch (error) {
        console.error('Error logging out:', error);
      }
    }
  };

  return (
    <Button onClick={handleLogout} variant="outline">
      Logout
    </Button>
  );
};

export default LogoutButton;
