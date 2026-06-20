import { useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Shield } from 'lucide-react';

interface DateOfBirthSelectorProps {
  value: string;
  onChange: (value: string) => void;
  minAge?: number;
}

const months = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

export const DateOfBirthSelector = ({ value, onChange, minAge = 13 }: DateOfBirthSelectorProps) => {
  // Parse existing value
  const parsedDate = useMemo(() => {
    if (!value) return { year: '', month: '', day: '' };
    const [year, month, day] = value.split('-');
    return { year: year || '', month: month || '', day: day || '' };
  }, [value]);

  // Generate years (from minAge years ago to 100 years ago)
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const maxYear = currentYear - minAge;
    const minYear = currentYear - 100;
    const yearList = [];
    for (let year = maxYear; year >= minYear; year--) {
      yearList.push(year.toString());
    }
    return yearList;
  }, [minAge]);

  // Generate days based on selected month and year
  const days = useMemo(() => {
    const month = parseInt(parsedDate.month) || 1;
    const year = parseInt(parsedDate.year) || new Date().getFullYear();
    const daysInMonth = new Date(year, month, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => 
      (i + 1).toString().padStart(2, '0')
    );
  }, [parsedDate.month, parsedDate.year]);

  const handleChange = (field: 'year' | 'month' | 'day', newValue: string) => {
    const updated = { ...parsedDate, [field]: newValue };
    
    // Adjust day if it exceeds days in the new month
    if (field === 'month' || field === 'year') {
      const month = parseInt(field === 'month' ? newValue : updated.month) || 1;
      const year = parseInt(field === 'year' ? newValue : updated.year) || new Date().getFullYear();
      const daysInMonth = new Date(year, month, 0).getDate();
      if (parseInt(updated.day) > daysInMonth) {
        updated.day = daysInMonth.toString().padStart(2, '0');
      }
    }

    // Only emit if we have all parts
    if (updated.year && updated.month && updated.day) {
      onChange(`${updated.year}-${updated.month}-${updated.day}`);
    } else if (updated.year || updated.month || updated.day) {
      // Emit partial for tracking progress, but format properly
      const partialValue = [
        updated.year || '0000',
        updated.month || '00',
        updated.day || '00'
      ].join('-');
      onChange(partialValue);
    }
  };

  return (
    <div className="space-y-2">
      <Label>Date of Birth *</Label>
      <div className="grid grid-cols-3 gap-2">
        {/* Year */}
        <Select
          value={parsedDate.year}
          onValueChange={(val) => handleChange('year', val)}
        >
          <SelectTrigger className="h-12 bg-background">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent className="max-h-[300px] bg-background/98 backdrop-blur-xl border border-border/50 z-50">
            {years.map((year) => (
              <SelectItem key={year} value={year} className="cursor-pointer">
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Month */}
        <Select
          value={parsedDate.month}
          onValueChange={(val) => handleChange('month', val)}
        >
          <SelectTrigger className="h-12 bg-background">
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent className="max-h-[300px] bg-background/98 backdrop-blur-xl border border-border/50 z-50">
            {months.map((month) => (
              <SelectItem key={month.value} value={month.value} className="cursor-pointer">
                {month.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Day */}
        <Select
          value={parsedDate.day}
          onValueChange={(val) => handleChange('day', val)}
        >
          <SelectTrigger className="h-12 bg-background">
            <SelectValue placeholder="Day" />
          </SelectTrigger>
          <SelectContent className="max-h-[300px] bg-background/98 backdrop-blur-xl border border-border/50 z-50">
            {days.map((day) => (
              <SelectItem key={day} value={day} className="cursor-pointer">
                {day}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/50 border border-border/50">
        <Shield className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          <span className="font-medium text-foreground">Why we collect this:</span> We use your date of birth to verify you meet our minimum age requirement (13+), personalize your experience, and comply with legal requirements. Your birthday is kept private and never shared publicly.
        </p>
      </div>
    </div>
  );
};
