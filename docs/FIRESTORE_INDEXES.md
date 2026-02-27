# Firestore Composite Indexes

## When Indexes Are Required

Firestore requires composite indexes for queries that:

- Filter on one field and sort by another (`where()` + `orderBy()` on different fields)
- Use inequality filters on multiple fields
- Combine equality filters with `orderBy` on a different field

## Fixing "The query requires an index" Errors

1. **Check existing indexes** in `firestore.indexes.json`
2. **Add missing index** using the Firebase Console link in the error, or manually add to `firestore.indexes.json`:
   ```json
   {
     "collectionGroup": "collectionName",
     "queryScope": "COLLECTION",
     "fields": [
       {"fieldPath": "filterField", "order": "ASCENDING"},
       {"fieldPath": "sortField", "order": "DESCENDING"}
     ]
   }
   ```
3. **Deploy**: `npm run firebase:deploy:indexes`
4. Wait for indexes to finish building (Firebase Console → Firestore → Indexes)

## Preventative Checklist

When adding new Firestore queries in `services/database.ts`:

- [ ] Query uses `where` + `orderBy` on different fields? Add index.
- [ ] Index added to `firestore.indexes.json`
- [ ] Run `npm run firebase:deploy:indexes`
- [ ] Error handler includes `isFirestoreIndexError` hint when relevant
