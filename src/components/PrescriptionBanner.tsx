import React from 'react';
import { ArrowRight, FileCheck, Stethoscope, Sparkles } from 'lucide-react';

interface PrescriptionBannerProps {
  onDoctorConsultClick: () => void;
}

export const PrescriptionBanner: React.FC<PrescriptionBannerProps> = ({ onDoctorConsultClick }) => {
  return (
    <div className="rx-editorial-strip">
      <div className="container">
        <div className="rx-strip-card reveal-on-scroll">
          <div className="rx-strip-left">
            <div className="rx-icon-badge">
              <FileCheck size={18} />
            </div>
            <div className="rx-text-wrap">
              <span className="rx-eyebrow">Prescription Mandatory for Medical Procedures</span>
              <p className="rx-message">
                A valid doctor’s prescription is required for IV infusions, catheterization, Ryles tube, and suture removal. 
                <span className="rx-highlight"> Don’t have one? Connect with an experienced doctor online first.</span>
              </p>
            </div>
          </div>

          <button
            onClick={onDoctorConsultClick}
            className="rx-consult-cta"
          >
            <Stethoscope size={15} />
            <span>Online Doctor Consultation</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
