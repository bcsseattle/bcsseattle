import Link from 'next/link';
import Logo from '@/components/icons/Logo';

export default function Footer() {
  return (
    <footer className="mx-auto max-w-[1920px] bg-accent">
      <div className="grid grid-cols-1 gap-8 py-12 transition-colors duration-150 lg:grid-cols-12 border-gray-400 bg-primary-100 p-12">
        <div className="col-span-2 lg:col-span-3">
          <Link
            href="/"
            className="flex items-center flex-initial font-bold md:mr-24"
          >
            <Logo className="h-32" />
          </Link>
        </div>
        <div className="col-span-1 lg:col-span-2">
          <ul className="flex flex-col flex-initial md:flex-1">
            <li className="py-3 md:py-0 md:pb-4">
              <Link
                href="/"
                className="transition duration-150 ease-in-out hover:text-zinc-500"
              >
                Home
              </Link>
            </li>
            <li className="py-3 md:py-0 md:pb-4">
              <Link
                href="/about-us"
                className="transition duration-150 ease-in-out hover:text-zinc-500"
              >
                About
              </Link>
            </li>
            <li className="py-3 md:py-0 md:pb-4">
              <Link
                href="/contact-us"
                className="ransition duration-150 ease-in-out hover:text-zinc-500"
              >
                Contact Us
              </Link>
            </li>
          </ul>
        </div>
        <div className="col-span-1 lg:col-span-2">
          <ul className="flex flex-col flex-initial md:flex-1">
            <li className="py-3 md:py-0 md:pb-4">
              <p className="font-bold ransition duration-150 ease-in-out hover:text-zinc-500">
                LEGAL
              </p>
            </li>
            <li className="py-3 md:py-0 md:pb-4">
              <Link
                href="/privacy"
                className="transition duration-150 ease-in-out hover:text-zinc-500"
              >
                Privacy Policy
              </Link>
            </li>
            <li className="py-3 md:py-0 md:pb-4">
              <Link
                href="/terms"
                className="transition duration-150 ease-in-out hover:text-zinc-500"
              >
                Terms of Use
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-gray-900 opacity-25" />
      <div className="py-4 mx-auto max-w-screen-xl text-center text-xs p-12">
        <p>
          Baloch Community Services of Seattle is a 501(c)(3) nonprofit
          organization. EIN. 99-2495973
        </p>
        <p>
          &copy; {new Date().getFullYear()}  Baloch Community Services of Seattle. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
