"use client"

import { ProductForm } from "@/components/producer/catalogue/product-form"

/**
 * Wrapper client pour la création — délègue à `<ProductForm mode='new' />`.
 */
export function NouveauProductClient({
  producerName,
  producerCity,
}: {
  producerName: string
  producerCity: string | null
}) {
  return (
    <ProductForm
      mode="new"
      producerName={producerName}
      producerCity={producerCity}
    />
  )
}
