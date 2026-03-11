'use client'

import { useState } from 'react'
import Image from 'next/image'

export default function TreasureChest() {
  const [visible, setVisible] = useState(false)

  const handleClick = () => {
    setVisible(true)
    setTimeout(() => setVisible(false), 3000)
  }

  return (
    <>
      <button
        onClick={handleClick}
        aria-label="Treasure"
        className="fixed bottom-4 right-4 z-50 opacity-40 hover:opacity-100 transition-opacity"
      >
        <Image src="/treasure chest.png" alt="Treasure chest" width={36} height={36} />
      </button>

      {visible && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black">
          <Image
            src="/snehas.png"
            alt="sneha"
            fill
            className="object-contain"
            priority
          />
        </div>
      )}
    </>
  )
}
