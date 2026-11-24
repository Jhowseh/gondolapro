import { fieldByCode, insertTextOf, PRINTABLE_FIELD_GROUPS, tag } from '../../../core/syspdvFields'

interface TagPickerProps {
  placeholder: string
  onPick: (tagText: string) => void
}

const GROUP_OPTIONS = PRINTABLE_FIELD_GROUPS.map((group) => (
  <optgroup key={group.id} label={group.label}>
    {group.fields.map((field) => (
      <option key={field.code} value={field.code}>
        {`${tag(field.code)}  ${field.label}`}
      </option>
    ))}
  </optgroup>
))

export function TagPicker({ placeholder, onPick }: TagPickerProps) {
  return (
    <select
      className="tag-picker"
      value=""
      onChange={(event) => {
        const field = fieldByCode(event.target.value)
        if (field) {
          onPick(insertTextOf(field))
        }
      }}
    >
      <option value="">{placeholder}</option>
      {GROUP_OPTIONS}
    </select>
  )
}
