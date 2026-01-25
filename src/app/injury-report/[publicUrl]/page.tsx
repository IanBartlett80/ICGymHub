'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface Field {
  id: string;
  fieldType: string;
  label: string;
  description: string | null;
  placeholder: string | null;
  required: boolean;
  order: number;
  options: string | null;
}

interface Section {
  id: string;
  title: string;
  description: string | null;
  order: number;
  fields: Field[];
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  headerColor: string;
  logoUrl: string | null;
  sections: Section[];
  clubId: string;
}

interface Coach {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

export default function PublicSubmissionForm() {
  const params = useParams();
  const publicUrl = params.publicUrl as string;
  
  const [template, setTemplate] = useState<Template | null>(null);
  const [formData, setFormData] = useState<{ [key: string]: any }>({});
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [currentSection, setCurrentSection] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [thankYouMessage, setThankYouMessage] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    loadTemplate();
  }, [publicUrl]);

  const loadTemplate = async () => {
    try {
      const res = await fetch(`/api/injury-submissions/public/${publicUrl}`);
      if (res.ok) {
        const data = await res.json();
        setTemplate(data.template);
        // Load coaches for this club
        if (data.template.clubId) {
          await loadCoaches(data.template.clubId);
        }
      } else {
        alert('Form not found or inactive');
      }
    } catch (error) {
      console.error('Error loading form:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCoaches = async (clubId: string) => {
    try {
      const res = await fetch(`/api/coaches/public/${clubId}`);
      if (res.ok) {
        const data = await res.json();
        setCoaches(data.coaches || []);
      }
    } catch (error) {
      console.error('Error loading coaches:', error);
    }
  };

  const validateSection = (sectionIndex: number): boolean => {
    if (!template) return false;

    const section = template.sections[sectionIndex];
    const newErrors: { [key: string]: string } = {};

    for (const field of section.fields) {
      if (field.required && !formData[field.id]) {
        newErrors[field.id] = 'This field is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextSection = () => {
    if (validateSection(currentSection)) {
      setCurrentSection(currentSection + 1);
      window.scrollTo(0, 0);
    }
  };

  const prevSection = () => {
    setCurrentSection(currentSection - 1);
    window.scrollTo(0, 0);
  };

  const handleSubmit = async () => {
    if (!validateSection(currentSection)) {
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/injury-submissions/public/${publicUrl}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formData,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setThankYouMessage(data.message);
        setSubmitted(true);
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to submit form');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Failed to submit form');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCoachSelection = (fieldId: string, coachName: string, section: Section) => {
    // Find the selected coach
    const selectedCoach = coaches.find(c => c.name === coachName);
    
    if (selectedCoach) {
      // Find Coach Email and Coach Phone fields in the same section
      const coachEmailField = section.fields.find(f => f.label === 'Coach Email');
      const coachPhoneField = section.fields.find(f => f.label === 'Coach Phone');
      
      const updates: { [key: string]: any } = { [fieldId]: coachName };
      
      if (coachEmailField) {
        updates[coachEmailField.id] = selectedCoach.email || '';
      }
      if (coachPhoneField) {
        updates[coachPhoneField.id] = selectedCoach.phone || '';
      }
      
      setFormData({ ...formData, ...updates });
    } else {
      setFormData({ ...formData, [fieldId]: coachName });
    }
    
    if (errors[fieldId]) {
      setErrors({ ...errors, [fieldId]: '' });
    }
  };

  const renderField = (field: Field, section: Section) => {
    const value = formData[field.id] || '';
    const error = errors[field.id];

    const commonInputClass = `w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
      error ? 'border-red-500' : 'border-gray-300'
    }`;

    const updateValue = (newValue: any) => {
      setFormData({ ...formData, [field.id]: newValue });
      if (error) {
        setErrors({ ...errors, [field.id]: '' });
      }
    };

    switch (field.fieldType) {
      case 'TEXT_SHORT':
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => updateValue(e.target.value)}
            placeholder={field.placeholder || ''}
            className={commonInputClass}
          />
        );

      case 'TEXT_LONG':
        return (
          <textarea
            value={value}
            onChange={(e) => updateValue(e.target.value)}
            placeholder={field.placeholder || ''}
            rows={4}
            className={commonInputClass}
          />
        );

      case 'NUMBER':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => updateValue(e.target.value)}
            placeholder={field.placeholder || ''}
            className={commonInputClass}
          />
        );

      case 'EMAIL':
        return (
          <input
            type="email"
            value={value}
            onChange={(e) => updateValue(e.target.value)}
            placeholder={field.placeholder || 'email@example.com'}
            className={commonInputClass}
          />
        );

      case 'PHONE':
        return (
          <input
            type="tel"
            value={value}
            onChange={(e) => updateValue(e.target.value)}
            placeholder={field.placeholder || '0400 000 000'}
            className={commonInputClass}
          />
        );

      case 'DATE':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => updateValue(e.target.value)}
            className={commonInputClass}
          />
        );

      case 'TIME':
        return (
          <input
            type="time"
            value={value}
            onChange={(e) => updateValue(e.target.value)}
            className={commonInputClass}
          />
        );

      case 'DATETIME':
        return (
          <input
            type="datetime-local"
            value={value}
            onChange={(e) => updateValue(e.target.value)}
            className={commonInputClass}
          />
        );

      case 'DROPDOWN':
        const dropdownOptions = field.options ? JSON.parse(field.options) : [];
        const isCoachField = field.label === 'Supervising Coach';
        
        return (
          <select
            value={value}
            onChange={(e) => {
              if (isCoachField) {
                handleCoachSelection(field.id, e.target.value, section);
              } else {
                updateValue(e.target.value);
              }
            }}
            className={commonInputClass}
          >
            <option value="">Select an option...</option>
            {dropdownOptions.map((option: string, index: number) => (
              <option key={index} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'MULTIPLE_CHOICE':
        const radioOptions = field.options ? JSON.parse(field.options) : [];
        return (
          <div className="space-y-2">
            {radioOptions.map((option: string, index: number) => (
              <label key={index} className="flex items-center">
                <input
                  type="radio"
                  name={field.id}
                  value={option}
                  checked={value === option}
                  onChange={(e) => updateValue(e.target.value)}
                  className="mr-2"
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        );

      case 'CHECKBOXES':
        const checkboxOptions = field.options ? JSON.parse(field.options) : [];
        const selectedValues = Array.isArray(value) ? value : [];
        return (
          <div className="space-y-2">
            {checkboxOptions.map((option: string, index: number) => (
              <label key={index} className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedValues.includes(option)}
                  onChange={(e) => {
                    const newValues = e.target.checked
                      ? [...selectedValues, option]
                      : selectedValues.filter((v: string) => v !== option);
                    updateValue(newValues);
                  }}
                  className="mr-2"
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        );

      default:
        return <div>Unsupported field type</div>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading form...</div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900 mb-2">Form Not Found</div>
          <div className="text-gray-600">This form is not available or has been deactivated.</div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Submission Received</h1>
          <p className="text-gray-600">{thankYouMessage}</p>
        </div>
      </div>
    );
  }

  const currentSectionData = template.sections[currentSection];
  const progress = ((currentSection + 1) / template.sections.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div 
        className="py-8 px-6"
        style={{ backgroundColor: template.headerColor }}
      >
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-white">{template.name}</h1>
          {template.description && (
            <p className="text-white/90 mt-2">{template.description}</p>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-gray-200 h-2">
        <div 
          className="h-2 transition-all duration-300"
          style={{ width: `${progress}%`, backgroundColor: template.headerColor }}
        />
      </div>

      {/* Form Content */}
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">{currentSectionData.title}</h2>
            {currentSectionData.description && (
              <p className="text-gray-600 mt-2">{currentSectionData.description}</p>
            )}
          </div>

          <div className="space-y-6">
            {currentSectionData.fields.map((field) => (
              <div key={field.id}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {field.description && (
                  <p className="text-sm text-gray-500 mb-2">{field.description}</p>
                )}
                {renderField(field, currentSectionData)}
                {errors[field.id] && (
                  <p className="text-sm text-red-600 mt-1">{errors[field.id]}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <button
            onClick={prevSection}
            disabled={currentSection === 0}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>

          {currentSection === template.sections.length - 1 ? (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Form'}
            </button>
          ) : (
            <button
              onClick={nextSection}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
