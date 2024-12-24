import ContactForm from '@/components/ui/ctonact-form';

export default async function Page() {
  return (
    <section className="mb-32">
      <div className="max-w-6xl px-4 py-8 mx-auto sm:px-6 sm:pt-24 lg:px-8">
        <div className="sm:align-center sm:flex sm:flex-col">
          <ContactForm />
        </div>
      </div>
    </section>
  );
}
