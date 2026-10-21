# NLP Methodology & Formal Behavioral Contract Analysis

## 1. Problem Statement

Traditional API diffing tools (e.g. `openapi-diff`, `swagger-diff`) inspect only structural AST changes: routes, schema types, and parameter required flags. However, modern API breaking changes frequently occur in natural language documentation and contracts without any schema alterations. Examples include:
- Scope narrowing (*"Returns all products"* &rarr; *"Returns available products only"*).
- Execution model changes (*"Synchronous immediate settlement"* &rarr; *"Enqueued into asynchronous worker queue"*).
- Deontic condition flips (*"Authentication is optional"* &rarr; *"Caller must provide valid authorization header"*).
- Behavioral quotas (*"Rate limited to 50 requests per minute"*).

Our methodology combines **dense sentence vector embeddings** with **deontic modality extraction** to bridge the gap between structural diffing and semantic behavioral verification.

---

## 2. Sentence Embeddings Pipeline

1. **Preprocessing & Normalization (`TextPreprocessor`):**
   Markdown headers, code backticks, and punctuation are stripped. Multiple whitespaces and tabs are collapsed into single spaces.
2. **Dense Vector Encoding:**
   Texts are encoded into 384-dimensional dense vectors using the pre-trained `sentence-transformers/all-MiniLM-L6-v2` model:
   $$\vec{e} = \text{Model}(T)$$
   Embeddings are L2-normalized so that cosine similarity reduces to the dot product:
   $$\text{CosineSimilarity}(\vec{u}, \vec{v}) = \sum_{i=1}^{d} u_i \cdot v_i$$
3. **Semantic Drift Metric:**
   $$\text{Drift} = 1.0 - \text{CosineSimilarity}$$

---

## 3. Linguistic & Deontic Modality Grammar

We extract deontic logic statements using regex-based pattern matchers and `spaCy en_core_web_sm` dependency parsing:

| Modality Class | Linguistic Markers | Example Extracted Statement |
| :--- | :--- | :--- |
| **Obligation** | *must*, *shall*, *required to*, *mandatory* | *"Caller must provide idempotency_key."* |
| **Prohibition** | *must not*, *shall not*, *cannot*, *forbidden* | *"Clients must not exceed rate limit."* |
| **Permission** | *may*, *can*, *optional*, *permitted* | *"Users may optionally include tracking tags."* |

### Precondition & Postcondition Rules
- **Preconditions:** Identified by temporal markers (*"prior to"*, *"before calling"*, *"prerequisite"*).
- **Postconditions:** Identified by execution model cues (*"asynchronously"*, *"background queue"*, *"purged"*).
- **Rate-limit Documentation:** Matches quota expressions (*"rate limit"*, *"requests per minute"*, *"HTTP 429"*).
- **Deprecation Notices:** Matches lifecycle cues (*"deprecated"*, *"will be removed"*, *"sunset"*).

---

## 4. Conflict & Contradiction Detection Heuristics

When comparing old text $T_1$ and new text $T_2$:
1. **Scope Narrowing:** If $T_1$ references universal quantifiers (*all*, *every*) and $T_2$ introduces conditional filters (*only*, *available*, *subset*), scope narrowing is flagged.
2. **Negation Flipping:** If automatic behaviors (*"retries automatically"*) are explicitly negated (*"does not retry"*), a critical breaking behavioral change is flagged.
3. **State Inversion:** Shifting from *"deleted records"* to *"active records"*.

---

## 5. Risk Score Formulation

The composite API Risk Score ($R \in [0, 100]$) summarizes release impact:

$$R = \frac{\sum_{i=1}^{N} w_i}{\max(1, N)} \times 100$$

Where weights $w_i$ correspond to:
- `STRUCTURAL_BREAKING` = 1.0
- `BEHAVIORAL_BREAKING` = 1.0
- `DUAL_BREAKING` = 1.0
- `POTENTIALLY_BREAKING` = 0.5
- `NON_BREAKING` = 0.0
