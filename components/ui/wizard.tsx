'use client';
import React, { ReactNode, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from './card';

interface WizardProps {
  wizardStep: number;
  steps: {
    title?: string;
    content: ReactNode;
    action?: string | ReactNode;
  }[];
  children?: ReactNode;
}

export const Wizard = ({ wizardStep, children, steps }: WizardProps) => {
  const currentStep = steps[wizardStep];
  const { title, content, action } = currentStep;

  return (
    <div className="flex flex-col gap-12 space-y-6">
      <Card className="md:w-[600px]">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription></CardDescription>
        </CardHeader>
        <CardContent>
          {content}
          <div>{children}</div>
          {action}
        </CardContent>
      </Card>
    </div>
  );
};
