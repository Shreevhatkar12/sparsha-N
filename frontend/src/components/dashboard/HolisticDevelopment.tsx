import React from "react";
import { Sparkles } from "lucide-react";
import { AipTopicWheel } from "./AipTopicWheel";
import { AipImpactChart } from "./AipImpactChart";
import type { PeriodValue } from "./PeriodFilter";

export const HolisticDevelopment: React.FC<{ periodVal: PeriodValue; centerId?: string }> = ({ periodVal, centerId }) => {
  return (
    <div className="mb-6">
      <h3 className="font-bold text-neutral-900 mb-4 flex items-center gap-2">
        <Sparkles size={18} className="text-primary" />
        Holistic Development
      </h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AipTopicWheel />
        <AipImpactChart periodVal={periodVal} centerId={centerId} />
      </div>
    </div>
  );
};
