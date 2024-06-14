import Mission from '@/components/mission';
import Hero from '@/components/Hero';
import ProgramsAndServices from '@/components/programs-and-services';
// import ThreeRows from '@/components/three-rows';
// import HalfHalf from '@/components/half-half';

export default async function PricingPage() {
  return (
    <>
      <Hero />
      <div className="border-b" />
      <Mission />
      <ProgramsAndServices />
      {/* <ThreeRows /> */}
      {/* <HalfHalf /> */}
    </>
  );
}
