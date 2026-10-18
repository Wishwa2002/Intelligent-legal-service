# Owner action required — historical database credential exposure

Rotation/revocation is **UNCONFIRMED**. Existing evidence identifies non-placeholder PostgreSQL/Neon connection credentials in historical commit c0ea64584769a65b217a2eadb1a4a30489bd4af0. Removal from current files does not revoke a credential, and its present validity was not tested.

Repository/database owner must privately confirm revocation or rotate the affected credential, update all authorised consumers, review access history, and record the action date and affected service without the secret value. Supply redacted owner/provider confirmation to close the incident. Do not place replacement credentials in Git or report evidence. No connection using the historical credential, production rotation or history rewrite was performed.
