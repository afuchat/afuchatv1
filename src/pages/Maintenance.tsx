import { Wrench } from 'lucide-react';

const Maintenance = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
      <Wrench className="h-12 w-12 text-primary mb-4" />
      <h1 className="text-3xl font-bold mb-2">Under Maintenance</h1>
      <p className="text-muted-foreground max-w-md">
        AfuChat is currently undergoing maintenance.  
        Please check back shortly.
      </p>
    </div>
  );
};

export default Maintenance;
