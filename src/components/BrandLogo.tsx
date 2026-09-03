import Image from 'next/image'

type Props = {
  width?: number
  height?: number
  marginBottom?: number
}

export function BrandLogo({ width = 220, height = 78, marginBottom = 32 }: Props) {
  return (
    <Image
      src="/foird-gerber-logo.jpg"
      alt="Froid Climatisation Gerber"
      width={width}
      height={height}
      priority
      unoptimized
      style={{
        objectFit: 'contain',
        marginBottom,
        mixBlendMode: 'multiply',
      }}
    />
  )
}
