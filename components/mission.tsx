// h1 on its own page; h2 when it's a section of another page, e.g. the home page (BUG-051).
export default function Mission({ heading: Heading = 'h1' }: { heading?: 'h1' | 'h2' }) {
  return (
    <section className="max-w-3xl pb-8 pt-8 lg:pt-16">
      <Heading className="text-display text-foreground">Our Mission</Heading>
      <p className="mt-3 font-serif text-doc-lead text-foreground">
        BCS Seattle aims to enhance the cultural heritage and community welfare
        of the Baloch community in the Greater Seattle area. We are committed to
        organizing educational programs, hosting cultural events, and providing
        social services that foster integration and well-being. Our activities
        are designed to promote and preserve Baloch culture, offering both
        members and the wider community opportunities to engage with and learn
        about Baloch traditions and contemporary life.
      </p>
    </section>
  );
}
