import { FIELD_GROUPS, fieldByCode, insertTextOf, isPrintableField, SYSPDV_FIELDS, tag } from '../../../core/syspdvFields'

interface TagPickerProps {
  placeholder: string
  onPick: (tagText: string) => void
}

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
      {FIELD_GROUPS.map((group) => (
        <optgroup key={group.id} label={group.label}>
          {SYSPDV_FIELDS.filter((field) => isPrintableField(field) && field.group === group.id).map((field) => (
            <option key={field.code} value={field.code}>
              {`${tag(field.code)}  ${field.label}`}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  )
}
