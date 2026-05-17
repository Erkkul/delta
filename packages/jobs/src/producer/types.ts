import {
  type InseeAdapter,
  type Producer,
  type ProducerAdapter,
} from "@delta/core/producer"

/**
 * Dépendances injectées dans `createVerifySiretFunction`. L'adapter
 * Producer doit exposer `findById` en plus du contrat de `ProducerAdapter`
 * (cf. `verify-siret-with-insee.ts` côté core qui le requiert).
 */
export type VerifySiretFunctionDeps = ProducerAdapter &
  InseeAdapter & {
    findById(id: string): Promise<Producer | null>
  }
