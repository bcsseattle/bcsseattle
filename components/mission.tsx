// h1 on its own page; h2 when it's a section of another page, e.g. the home page (BUG-051).
export default function Mission({ heading: Heading = 'h1' }: { heading?: 'h1' | 'h2' }) {
  return (
    <section className="container my-12 text-foreground">
      <Heading className="text-2xl font-bold">Our Mission</Heading>
      <p className="mt-5">
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
