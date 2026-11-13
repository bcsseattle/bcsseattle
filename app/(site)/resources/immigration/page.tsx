import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { IMMIGRATION_GUIDES, IMMIGRATION_INTRO } from '@/utils/programs';

export interface Resource {
  name: string;
  href: string;
  image: string;
}

// The guides are shared with the app (utils/programs.ts).
const resources: Resource[] = IMMIGRATION_GUIDES.map((g) => ({
  name: g.title,
  href: `/resources/immigration/${g.slug}`,
  image: g.image
}));

export default async function Page() {
  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return redirect('/signin');
  }
  
  return (
    <div className="pb-8 pt-8 lg:pt-16">
      <h1 className="text-display text-foreground">Immigration Resources</h1>
      <p className="mt-3 max-w-3xl font-serif text-doc-lead text-foreground">
        {IMMIGRATION_INTRO}
      </p>
      <p>
        Here are some resources that could assist at various stages of the
        immigration process:
      </p>

      <div className="flex flex-wrap justify-center mt-10">
        {resources.map((resource) => (
          <div
            key={resource.name}
            className="m-1 sm:m-4 max-w-sm relative isolate transition duration-300 ease-in-out hover:scale-110"
          >
            <Link href={resource.href}>
              <Image
                src={resource.image}
                alt={`${resource.name}`}
                className="aspect-[3/4] w-fit object-cover flex rounded-lg h-full flex-col justify-end"
                width={300}
                height={400}
              />
              <div className="absolute inset-0 bg-primary opacity-60 rounded-md"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <h2 className="text-primary-foreground text-2xl font-bold">
                  {resource.name}
                </h2>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
