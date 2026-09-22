type CustomerFeatureAccess = 'unavailable' | 'available'

interface ProductAccess {
  brandBrain: {
    customerAccess: CustomerFeatureAccess
    minimumHistoryMonths: number
    requiresAllyoRelease: boolean
  }
}

// Brand Brain learns from the customer's Allyo project history, but it is not
// part of the initial customer experience. In production, customerAccess should
// come from the workspace entitlements returned by the backend.
export const productAccess: ProductAccess = {
  brandBrain: {
    customerAccess: 'unavailable',
    minimumHistoryMonths: 2,
    requiresAllyoRelease: true,
  },
}

export const canAccessBrandBrain = productAccess.brandBrain.customerAccess === 'available'
