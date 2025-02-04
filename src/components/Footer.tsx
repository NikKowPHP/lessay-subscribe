import Link from "next/link";



export default function Footer() {
  return (<footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center text-sm text-gray-600 dark:text-gray-400">
    <Link className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors" href="/">
      Home
    </Link>
    <Link className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors" href="/about">
      About
    </Link>
    <Link className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors" href="/terms">
      Terms
    </Link>
    <Link className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors" href="/privacy">
      Privacy
    </Link>
  </footer>
  )
}