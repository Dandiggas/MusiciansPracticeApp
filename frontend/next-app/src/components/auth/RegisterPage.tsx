"use client";

import React, { useState } from 'react';
import axios, { AxiosError } from 'axios';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface FormErrors {
  username?: string;
  email?: string;
  password1?: string;
  password2?: string;
}

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password1: '',
    password2: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const router = useRouter();

  const validate = () => {
    let tempErrors: FormErrors = {};
    tempErrors.username = formData.username ? "" : "Username is required.";
    tempErrors.email = formData.email.match(/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i) ? "" : "Email is not valid.";
    tempErrors.password1 = formData.password1.length > 5 ? "" : "Password must be at least 6 characters.";
    tempErrors.password2 = formData.password1 === formData.password2 ? "" : "Passwords do not match.";

    setErrors(tempErrors);
    return Object.values(tempErrors).every(x => x === "");
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      const apiUrl = `${apiBaseUrl}/dj-rest-auth/registration/`;

      try {
        const response = await axios.post(apiUrl, formData);
        console.log(response.data);
        router.push('/login');
      } catch (error) {
        console.error('Registration error', error);
        if (axios.isAxiosError(error)) {
          const axiosError = error as AxiosError<any>;
          if (axiosError.response?.data) {
            setErrors(axiosError.response.data);
          }
        }
      }
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Register</CardTitle>
          <CardDescription>
            Create a new account to get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="your_username"
                required
              />
              {errors.username && (
                <div className="text-sm font-medium text-destructive">
                  {errors.username}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="text"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your@email.com"
                required
              />
              {errors.email && (
                <div className="text-sm font-medium text-destructive">
                  {errors.email}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password1">Password</Label>
              <Input
                id="password1"
                type="password"
                name="password1"
                value={formData.password1}
                onChange={handleChange}
                placeholder="••••••••"
                required
              />
              {errors.password1 && (
                <div className="text-sm font-medium text-destructive">
                  {errors.password1}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password2">Confirm Password</Label>
              <Input
                id="password2"
                type="password"
                name="password2"
                value={formData.password2}
                onChange={handleChange}
                placeholder="••••••••"
                required
              />
              {errors.password2 && (
                <div className="text-sm font-medium text-destructive">
                  {errors.password2}
                </div>
              )}
            </div>
            <Button type="submit" className="w-full">
              Register
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default RegisterPage;
