import ContactForm from '@/components/ui/ctonact-form';

export default async function Page() {
  return (
    <section className="pb-8">
      <div className="pt-8 lg:pt-16">
        <div className="flex flex-col">
          <ContactForm heading="h1" />
        </div>
      </div>
    </section>
  );
}
