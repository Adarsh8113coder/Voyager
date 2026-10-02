import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html, Line, OrbitControls, Stars } from '@react-three/drei'
import * as THREE from 'three'
import type { City } from '../types'
import { EARTH_R, arcPoints, latLngToVec3 } from '../utils/geo'

function makeEarthTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 2048; c.height = 1024
  const g = c.getContext('2d')!
  const grad = g.createLinearGradient(0, 0, 0, 1024)
  grad.addColorStop(0, '#0b1a33'); grad.addColorStop(0.5, '#0f2a4d'); grad.addColorStop(1, '#0b1a33')
  g.fillStyle = grad; g.fillRect(0, 0, 2048, 1024)
  g.strokeStyle = 'rgba(94,231,255,0.18)'; g.lineWidth = 1.5
  for (let lng = 0; lng <= 360; lng += 15) { g.beginPath(); g.moveTo((lng / 360) * 2048, 0); g.lineTo((lng / 360) * 2048, 1024); g.stroke() }
  for (let lat = 0; lat <= 180; lat += 15) { g.beginPath(); g.moveTo(0, (lat / 180) * 1024); g.lineTo(2048, (lat / 180) * 1024); g.stroke() }
  return new THREE.CanvasTexture(c)
}

function Earth() {
  const tex = useMemo(makeEarthTexture, [])
  return (
    <group>
      <mesh>
        <sphereGeometry args={[EARTH_R, 96, 96]} />
        <meshStandardMaterial map={tex} roughness={0.9} metalness={0.1} />
      </mesh>
      <mesh scale={1.07}>
        <sphereGeometry args={[EARTH_R, 64, 64]} />
        <meshBasicMaterial color="#5ee7ff" transparent opacity={0.1} side={THREE.BackSide} />
      </mesh>
    </group>
  )
}

interface MarkerProps {
  city: City; kind: 'origin' | 'destination' | 'visited' | 'default'
  selected: boolean; onSelect: (id: string) => void
}

function Marker({ city, kind, selected, onSelect }: MarkerProps) {
  const [hover, setHover] = useState(false)
  const pos = useMemo(() => latLngToVec3(city.lat, city.lng, EARTH_R + 0.01), [city])
  const color = { origin: '#34d399', destination: '#f472b6', visited: '#5ee7ff', default: '#94a3b8' }[kind]
  const size = kind === 'default' ? 0.022 : 0.034
  return (
    <group position={pos}>
      <mesh
        scale={hover || selected ? 1.8 : 1}
        onClick={(e) => { e.stopPropagation(); onSelect(city.id) }}
        onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { setHover(false); document.body.style.cursor = 'auto' }}
      >
        <sphereGeometry args={[size, 12, 12]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {(hover || selected) && (
        <Html distanceFactor={8} style={{ pointerEvents: 'none' }} center>
          <div className="whitespace-nowrap rounded-md bg-black/70 px-2 py-1 text-xs text-white -translate-y-6">{city.name}</div>
        </Html>
      )}
    </group>
  )
}


/** All cities drawn as one Points object (fast even with 30k+ cities). */
function CityPoints({ cities, onSelect }: { cities: City[]; onSelect: (id: string) => void }) {
  const { camera } = useThree()
  const [hover, setHover] = useState<number | null>(null)
  const geo = useMemo(() => {
    const pos = new Float32Array(cities.length * 3)
    const col = new Float32Array(cities.length * 3)
    const base = new THREE.Color('#7c8ba5'), cap = new THREE.Color('#e2e8f0')
    cities.forEach((c, i) => {
      latLngToVec3(c.lat, c.lng, EARTH_R + 0.005).toArray(pos, i * 3)
      ;(c.isCapital ? cap : base).toArray(col, i * 3)
    })
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('color', new THREE.BufferAttribute(col, 3))
    return g
  }, [cities])

  // ignore points on the far side of the globe
  const facing = (i: number) => {
    const p = geo.getAttribute('position')
    const v = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i))
    return v.dot(camera.position) > EARTH_R * EARTH_R
  }

  return (
    <group>
      <points
        geometry={geo}
        onClick={(e) => { if (e.index != null && facing(e.index)) { e.stopPropagation(); onSelect(cities[e.index].id) } }}
        onPointerMove={(e) => {
          if (e.index != null && facing(e.index)) { e.stopPropagation(); setHover(e.index); document.body.style.cursor = 'pointer' }
        }}
        onPointerOut={() => { setHover(null); document.body.style.cursor = 'auto' }}
      >
        <pointsMaterial vertexColors size={0.03} sizeAttenuation depthWrite={false} />
      </points>
      {hover != null && (
        <Html position={latLngToVec3(cities[hover].lat, cities[hover].lng, EARTH_R + 0.01)} distanceFactor={8} style={{ pointerEvents: 'none' }} center>
          <div className="whitespace-nowrap rounded-md bg-black/70 px-2 py-1 text-xs text-white -translate-y-6">{cities[hover].name}</div>
        </Html>
      )}
    </group>
  )
}

function FlightRoute({ from, to }: { from: City; to: City }) {
  const pts = useMemo(
    () => arcPoints(latLngToVec3(from.lat, from.lng, EARTH_R), latLngToVec3(to.lat, to.lng, EARTH_R)),
    [from, to]
  )
  const plane = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    const t = (clock.getElapsedTime() * 0.15) % 1
    const p = pts[Math.floor(t * (pts.length - 1))]
    if (plane.current) plane.current.position.copy(p)
  })
  return (
    <group>
      <Line points={pts} color="#fbbf24" lineWidth={2} />
      <mesh ref={plane}><sphereGeometry args={[0.045, 12, 12]} /><meshBasicMaterial color="#fde68a" /></mesh>
    </group>
  )
}

/** Orbit controls + smooth fly-to + auto-rotate that pauses while the user interacts. */
function CameraRig({ target }: { target: THREE.Vector3 | null }) {
  const { camera } = useThree()
  const controls = useRef<any>(null)
  const flying = useRef(false)
  const [auto, setAuto] = useState(true)
  const resume = useRef<number | undefined>(undefined)

  useEffect(() => { flying.current = !!target }, [target])
  useEffect(() => () => window.clearTimeout(resume.current), [])

  useFrame(() => {
    if (!flying.current || !target || !controls.current) return
    const cur = camera.position.clone().normalize()
    const dst = target.clone().normalize()
    const q = new THREE.Quaternion().setFromUnitVectors(cur, dst)
    const step = new THREE.Quaternion().slerp(q, 0.08)
    camera.position.applyQuaternion(step)
    controls.current.update()
    if (cur.angleTo(dst) < 0.01) flying.current = false
  })

  return (
    <OrbitControls
      ref={controls}
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      minDistance={3}
      maxDistance={9}
      autoRotate={auto}
      autoRotateSpeed={0.5}
      onStart={() => { flying.current = false; setAuto(false); window.clearTimeout(resume.current) }}
      onEnd={() => { resume.current = window.setTimeout(() => setAuto(true), 4000) }}
    />
  )
}

interface Props {
  cities: City[]; visited: Set<string>
  originId: string | null; destId: string | null; selectedId: string | null
  onSelect: (id: string) => void
}

export default function TravelGlobe({ cities, visited, originId, destId, selectedId, onSelect }: Props) {
  const byId = useMemo(() => new Map(cities.map((c) => [c.id, c])), [cities])
  const origin = originId ? byId.get(originId) : undefined
  const dest = destId ? byId.get(destId) : undefined
  const sel = selectedId ? byId.get(selectedId) : undefined
  const target = useMemo(() => (sel ? latLngToVec3(sel.lat, sel.lng, 5) : null), [sel])

  return (
    <Canvas camera={{ position: [0, 1.5, 6], fov: 45 }} dpr={[1, 2]} raycaster={{ params: { Points: { threshold: 0.03 } } as any }}>
      <ambientLight intensity={0.9} />
      <directionalLight position={[5, 3, 5]} intensity={1.2} />
      <Stars radius={100} depth={50} count={3000} factor={4} fade />
      <Earth />
      <CityPoints cities={cities} onSelect={onSelect} />
      {[...new Set([...visited, originId, destId, selectedId])].map((id) => {
        const c = id ? byId.get(id) : undefined
        if (!c) return null
        return (
          <Marker
            key={c.id}
            city={c}
            selected={c.id === selectedId}
            onSelect={onSelect}
            kind={c.id === originId ? 'origin' : c.id === destId ? 'destination' : visited.has(c.id) ? 'visited' : 'default'}
          />
        )
      })}
      {origin && dest && origin.id !== dest.id && <FlightRoute from={origin} to={dest} />}
      <CameraRig target={target} />
    </Canvas>
  )
}
