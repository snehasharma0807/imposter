'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'

const COUNT = 10

function makePositions() {
  return Array.from({ length: COUNT }, () => ({
    top: `${15 + Math.random() * 70}%`,
    left: `${10 + Math.random() * 80}%`,
    rotate: Math.random() * 30 - 15,
  }))
}

export default function TreasureChest() {
  const [active, setActive] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const positionsRef = useRef(makePositions())

  const handleClick = () => {
    if (active) return
    positionsRef.current = makePositions()
    setActive(true)
  }

  useEffect(() => {
    if (!active || !containerRef.current) return

    const photos = Array.from(
      containerRef.current.querySelectorAll<HTMLElement>('.sneha-photo')
    )
    let cancelled = false

    async function run() {
      const { animate, stagger } = await import('animejs')

      // Burst in — scale up with a spring bounce, random stagger
      animate(photos, {
        scale: [0, 1],
        opacity: [0, 1],
        rotate: (el: Element, i: number) => [
          positionsRef.current[i].rotate - 180,
          positionsRef.current[i].rotate,
        ],
        duration: 700,
        delay: stagger(60, { from: 'random' }),
        ease: 'spring(2, 60, 12, 0)',
      })

      // Wiggle after landing
      await new Promise((r) => setTimeout(r, 900))
      if (cancelled) return

      animate(photos, {
        rotate: (el: Element, i: number) => [
          positionsRef.current[i].rotate,
          positionsRef.current[i].rotate + 12,
          positionsRef.current[i].rotate - 12,
          positionsRef.current[i].rotate,
        ],
        duration: 500,
        delay: stagger(40, { from: 'random' }),
        ease: 'easeInOutSine',
      })

      // Wait then fly off in random directions
      await new Promise((r) => setTimeout(r, 1800))
      if (cancelled) return

      animate(photos, {
        translateX: () => `${(Math.random() > 0.5 ? 1 : -1) * (60 + Math.random() * 80)}vw`,
        translateY: () => `${(Math.random() > 0.5 ? 1 : -1) * (60 + Math.random() * 80)}vh`,
        rotate: () => Math.random() * 720 - 360,
        scale: [1, 0.3],
        opacity: [1, 0],
        duration: 800,
        delay: stagger(50, { from: 'random' }),
        ease: 'easeInBack(2)',
        onComplete: () => {
          if (!cancelled) setActive(false)
        },
      })
    }

    run()
    return () => { cancelled = true }
  }, [active])

  return (
    <>
      <button
        onClick={handleClick}
        aria-label="Treasure"
        className="fixed bottom-4 right-4 z-50 opacity-40 hover:opacity-100 transition-opacity"
      >
        <Image src="/treasure chest.png" alt="Treasure chest" width={36} height={36} />
      </button>

      {active && (
        <div
          ref={containerRef}
          className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden"
        >
          {positionsRef.current.map((pos, i) => (
            <div
              key={i}
              className="sneha-photo absolute"
              style={{
                top: pos.top,
                left: pos.left,
                transform: `translate(-50%, -50%) rotate(${pos.rotate}deg) scale(0)`,
                opacity: 0,
              }}
            >
              <Image
                src="/snehas.png"
                alt="sneha"
                width={180}
                height={180}
                className="rounded-2xl shadow-2xl border-4 border-white"
                priority
              />
            </div>
          ))}
        </div>
      )}
    </>
  )
}
