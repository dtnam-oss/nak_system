/**
 * Validation utilities for trip data
 */

export interface ValidationError {
  field: string
  message: string
  detailIndex: number
}

/**
 * Validate trip data for missing required fields
 * @param trip Trip object with details JSON
 * @returns Array of validation errors
 */
export function validateTrip(trip: any): ValidationError[] {
  const errors: ValidationError[] = []
  
  // Check if details exist
  if (!trip.details || !trip.details.chiTietLoTrinh || !Array.isArray(trip.details.chiTietLoTrinh)) {
    return errors
  }

  const requiredFields = [
    { key: 'loTrinh', label: 'Lộ trình' },
    { key: 'loTrinhChiTiet', label: 'Chi tiết lộ trình' },
    { key: 'bienKiemSoat', label: 'Biển số xe' },
    { key: 'taiTrongTinhPhi', label: 'Tải trọng tính phí' }
  ]

  trip.details.chiTietLoTrinh.forEach((detail: any, index: number) => {
    requiredFields.forEach(({ key, label }) => {
      const value = detail[key]
      if (value === null || value === undefined || value === '' || value === 0) {
        errors.push({
          field: key,
          message: `Thiếu ${label}`,
          detailIndex: index
        })
      }
    })
  })

  return errors
}

/**
 * Group errors by detail index
 */
export function groupErrorsByDetail(errors: ValidationError[]): Record<number, ValidationError[]> {
  return errors.reduce((acc, error) => {
    if (!acc[error.detailIndex]) {
      acc[error.detailIndex] = []
    }
    acc[error.detailIndex].push(error)
    return acc
  }, {} as Record<number, ValidationError[]>)
}

/**
 * Get unique error messages
 */
export function getUniqueErrorMessages(errors: ValidationError[]): string[] {
  const messages = new Set<string>()
  errors.forEach(error => messages.add(error.message))
  return Array.from(messages)
}
