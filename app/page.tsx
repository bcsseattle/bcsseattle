import Mission from '@/components/mission';
import Hero from '@/components/Hero';
import ProgramsAndServices from '@/components/programs-and-services';
import ContactForm from '@/components/ui/ctonact-form';
// import ThreeRows from '@/components/three-rows';
// import HalfHalf from '@/components/half-half';

export default async function PricingPage() {
  return (
    <>
      <Hero />
      <div className="border-b" />
      <Mission />
      <ProgramsAndServices />
      <ContactForm />
      {/* <ThreeRows /> */}
      {/* <HalfHalf /> */}
    </>
  );
}
