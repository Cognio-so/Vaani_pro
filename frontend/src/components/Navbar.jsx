import React from 'react'
import { Link } from 'react-router-dom'

const Navbar = () => {
  return (
    <header className="container mx-auto px-4 py-6 flex justify-between items-center relative z-10">
      <div className="flex items-center">
        <Link to="/" className="flex items-center text-white font-bold text-xl">
          <img src="/vannipro.png" alt="Vaanipro" className="w-16 h-12 mr-2" />
          <span>Vaani.pro</span>
        </Link>
      </div>
      <nav className="hidden md:block">
        <ul className="flex space-x-8">
          <li className="text-white hover:text-purple-200 cursor-pointer">About</li>
          <li className="text-white hover:text-purple-200 cursor-pointer">Features</li>
          <li className="text-white hover:text-purple-200 cursor-pointer">Solution</li>
          <li className="text-white hover:text-purple-200 cursor-pointer">Blog</li>
        </ul>
      </nav>
      <Link
        to="/login"
        className="bg-transparent border border-purple-500 text-white hover:bg-purple-500 font-medium py-2 px-6 rounded-full transition-all"
      >
        Login
      </Link>
    </header>
  )
}

export default Navbar
