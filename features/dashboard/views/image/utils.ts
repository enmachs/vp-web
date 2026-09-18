import { MAX_IMAGE_BYTES, MAX_IMAGE_LABEL } from '@/features/keystone/lib/upload-limits'

export const SUPPORTED_IMAGE_EXTENSIONS = [
  'jpg',
  'jpeg',
  'png',
  'webp',
  'gif',
] as const

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export type ImageValue =
  | { kind: 'empty' }
  | {
      kind: 'from-server'
      data: {
        id: string
        url: string
        extension: string
        filesize: number
        width: number
        height: number
      }
    }
  | {
      kind: 'upload'
      data: {
        file: File
        validity: ValidityState
      }
      previous: ImageValue
    }
  | { kind: 'remove'; previous?: Exclude<ImageValue, { kind: 'remove' }> }

export function validateImage(extensions: readonly string[], v: ImageValue) {
  if (v.kind !== 'upload') return
  if (!v.data.validity.valid) return 'Something went wrong, please reload and try again.'

  // check if the file is actually an image
  if (!v.data.file.type.includes('image')) {
    return `Sorry, that file type isn't accepted. Please try ${extensions.join(', ')}`
  }

  // Mirrors the multipart limit in pages/api/graphql.ts.
  if (v.data.file.size > MAX_IMAGE_BYTES) {
    return `That image is ${formatBytes(v.data.file.size)}; the limit is ${MAX_IMAGE_LABEL}.`
  }
}
