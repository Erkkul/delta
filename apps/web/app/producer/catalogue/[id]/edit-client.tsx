"use client"

import {
  ProductForm,
  type ProductFormInitial,
} from "@/components/producer/catalogue/product-form"

/**
 * Wrapper client pour l'édition — délègue à `<ProductForm mode='edit' />`.
 */
export function EditProductClient({
  initial,
  producerName,
  producerCity,
}: {
  initial: ProductFormInitial
  producerName: string
  producerCity: string | null
}) {
  return (
    <ProductForm
      mode="edit"
      initial={initial}
      producerName={producerName}
      producerCity={producerCity}
    />
  )
}
