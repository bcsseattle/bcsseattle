import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export interface Resource {
  name: string;
  href: string;
  image: string;
}

const resources: Resource[] = [
  {
    name: 'Asylum Resources',
    href: '/resources/immigration/asylum',
    image: '/asylum-officer.jpeg'
  },
  {
    name: 'Citizenship Preparation',
    href: '/resources/immigration/citizenship',
    image: '/citizenship-prep.jpeg'
  },
  {
    name: 'Support Organizations',
    href: '/resources/immigration/support-organizations',
    image: '/immigation-support-organizations.jpeg'
  }
];

export default async function Page() {
  const supabase = createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return redirect('/signin');
  }
  
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Immigration Resources</h1>
      <p className="mt-5">
        The U.S. immigration process can be incredibly complex and difficult to
        navigate. With numerous rules, regulations, and procedures, it’s easy to
        feel overwhelmed. While each person’s journey is unique, the following
        resources might be helpful in addressing some of the common challenges
        faced during the process.
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
              <div className="absolute inset-0 bg-gray-700 opacity-60 rounded-md"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <h2 className="text-white text-2xl font-bold">
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
