'use client'
import { useEffect, useRef } from 'react'

// Brand mark paths (64×64 viewBox) from the identity board
const BAG = [
  'M13 25C13 22 15 21 18 21H46C49 21 51 22 51 25L54.5 53C55 58 52 60 48 60H16C12 60 9 58 9.5 53Z',
  'M32 21C27 10 16 9 17 16C18 21 26 22 32 21Z',
  'M32 21C37 10 48 9 47 16C46 21 38 22 32 21Z',
]
const SPARK = 'M32 31C33 36 35 38 41 40C35 42 33 44 32 49C31 44 29 42 23 40C29 38 31 36 32 31Z'

// Extruded 3D logo. three.js is loaded lazily so it never blocks first paint;
// the flat SVG underneath stays visible until WebGL is ready (or forever if it fails).
export default function Mark3D() {
  const box = useRef(null)

  useEffect(() => {
    const el = box.current
    let stop = () => {}
    let dead = false

    ;(async () => {
      const THREE = await import('three')
      const { SVGLoader } = await import('three/addons/loaders/SVGLoader.js')
      if (dead) return

      let renderer
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
      } catch {
        return // no WebGL: keep the SVG fallback
      }
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
      el.appendChild(renderer.domElement)

      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100)
      camera.position.z = 9

      const svg = (d) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${d.map((p) => `<path d="${p}"/>`).join('')}</svg>`
      const extrude = (paths, depth, material) => {
        const shapes = new SVGLoader().parse(svg(paths)).paths.flatMap((p) => p.toShapes(true))
        const geo = new THREE.ExtrudeGeometry(shapes, { depth, bevelEnabled: true, bevelThickness: 1, bevelSize: 0.8, bevelSegments: 6, curveSegments: 24 })
        return new THREE.Mesh(geo, material)
      }

      const lime = new THREE.MeshStandardMaterial({ color: 0xb4e12b, roughness: 0.35, metalness: 0.05 })
      const night = new THREE.MeshStandardMaterial({ color: 0x14213d, roughness: 0.25, metalness: 0.2 })
      const bag = extrude(BAG, 6, lime)
      const spark = extrude([SPARK], 3, night)
      spark.position.z = 6.5 // sits proud of the bag face

      const logo = new THREE.Group()
      logo.add(bag, spark)
      logo.scale.set(0.075, -0.075, 0.075) // SVG y points down
      logo.position.set(-32 * 0.075, 35 * 0.075, -0.4)
      const pivot = new THREE.Group()
      pivot.add(logo)
      scene.add(pivot)

      scene.add(new THREE.HemisphereLight(0xffffff, 0x14213d, 1.6))
      const key = new THREE.DirectionalLight(0xffffff, 2.2)
      key.position.set(3, 4, 6)
      const rim = new THREE.PointLight(0xb4e12b, 30, 20)
      rim.position.set(-4, -2, 3)
      scene.add(key, rim)

      const size = () => {
        const { width, height } = el.getBoundingClientRect()
        renderer.setSize(width, height)
        camera.aspect = width / height
        camera.updateProjectionMatrix()
      }
      size()
      const ro = new ResizeObserver(size)
      ro.observe(el)

      const target = { x: 0, y: 0 }
      const onMove = (e) => {
        target.y = (e.clientX / innerWidth - 0.5) * 0.9
        target.x = (e.clientY / innerHeight - 0.5) * 0.5
      }
      addEventListener('pointermove', onMove, { passive: true })

      const still = matchMedia('(prefers-reduced-motion: reduce)').matches
      let visible = true
      const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting))
      io.observe(el)

      const clock = new THREE.Clock()
      renderer.setAnimationLoop(() => {
        if (!visible) return
        const t = clock.getElapsedTime()
        const sway = still ? 0 : Math.sin(t * 0.6) * 0.35
        pivot.rotation.y += (target.y + sway - pivot.rotation.y) * 0.05
        pivot.rotation.x += (target.x - pivot.rotation.x) * 0.05
        pivot.position.y = still ? 0 : Math.sin(t * 1.1) * 0.12
        renderer.render(scene, camera)
      })
      el.classList.add('live')

      stop = () => {
        renderer.setAnimationLoop(null)
        ro.disconnect()
        io.disconnect()
        removeEventListener('pointermove', onMove)
        scene.traverse((o) => o.geometry?.dispose())
        lime.dispose()
        night.dispose()
        renderer.dispose()
        renderer.domElement.remove()
      }
    })()

    return () => {
      dead = true
      stop()
    }
  }, [])

  return (
    <div className="mark3d" ref={box} aria-hidden="true">
      <svg viewBox="0 0 64 64" className="flat">
        {BAG.map((d) => <path key={d} fill="#B4E12B" d={d} />)}
        <path fill="#14213D" d={SPARK} />
      </svg>
    </div>
  )
}
