import type { CellComponent, FieldControllerConfig } from '../../types'
import { SUPPORTED_IMAGE_EXTENSIONS, validateImage, type ImageValue } from './utils'

export { validateImage, type ImageValue } from './utils'

export { Field } from './Field'

export const Cell: CellComponent<typeof controller> = ({ value }: { value: any; field: any; item: Record<string, unknown> }) => {
  if (!value) return null
  return (
    <div
      style={{
        alignItems: 'center',
        display: 'flex',
        height: 24,
        lineHeight: 0,
        width: 24,
      }}
    >
      <img style={{ maxHeight: '100%', maxWidth: '100%' }} src={value.url} alt="preview" />
    </div>
  )
}


export function controller(config: FieldControllerConfig) {
  return {
    path: config.path,
    label: config.label,
    description: config.description,
    graphqlSelection: `${config.path} {
      id
      url
      extension
      filesize
      width
      height
    }`,
    defaultValue: { kind: 'empty' },
    extensions: SUPPORTED_IMAGE_EXTENSIONS,
    deserialize(item: any): ImageValue {
      const value = item[config.path]
      if (!value) return { kind: 'empty' }
      return {
        kind: 'from-server',
        data: value,
      }
    },
    validate(value: ImageValue): boolean {
      return validateImage(SUPPORTED_IMAGE_EXTENSIONS, value) === undefined
    },
    serialize(value: ImageValue) {
      if (value.kind === 'upload') {
        return { [config.path]: { upload: value.data.file } }
      }
      if (value.kind === 'remove') {
        return { [config.path]: null }
      }
      return {}
    },
  }
}