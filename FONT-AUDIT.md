CURRENT UPDATE: See FONT-CLEANUP.txt. The main site is now standardised on DM Sans and IvyPresto Headline; unused font definitions/assets have been removed from these packages. Earlier inventory below is historical.

> Update: see FONT-SETUP.txt. The new main portfolio Adobe project tyq3xsd has now been created and incorporated into the prepared main package; the historical account-access notes below describe the earlier audit. No existing projects were deleted.

# Website font and publication check

Checked 21 October 2026. This is a source and font-file audit, not a blanket clearance of all portfolio artwork.

## Scope and result

Reviewed all 30 HTML pages and associated retrieved code/font files in the current main portfolio GitHub source at commit dfd5bd27c9b3b65ae1d08f2db788a29fc558b566; its M Furniture and Fern & Fell demos; the new interior repository’s uploaded index; and the prepared interior and main-portfolio update packages. Inspected bundled font metadata, including 17 unique inline font binaries and three physical WOFF2 files (some duplicates). No locally bundled commercial Adobe font binaries were found among the files inspected. A family name in unused CSS is not proof that the font is displayed or downloaded.

## Four websites

| Website | Fonts / delivery | Adobe project to retain |
|---|---|---|
| Julie Tadros Portfolio, including shared case pages and Elements | DM Sans and IvyPresto Headline in the shared typography; Inter and STIX Two Math in Elements/older editorial files; Office My Home embeds Jost, Montserrat and Nunito Sans. Some Elements CSS also mentions Poppins, Cormorant Garamond and Oooh Baby. | Existing main kit sis2ers; proposed name: Julie Tadros Portfolio |
| M Furniture | Acumin Pro and Georgia through Adobe kit bso8epk; Georgia also appears as a system fallback. | Existing kit bso8epk; proposed name: M Furniture |
| Fern & Fell | Poppins and Lora via Google Fonts. | None required. A fourth Adobe project would be optional and would require changing the embeds. |
| Julie Tadros Interior Design Portfolio | Nanum Myeongjo via Adobe; DM Sans, Libre Caslon Text and Source Serif 4 locally. PT Serif remains among comparison assets. | User-supplied Nanum kit ikn7ubz; proposed name: Julie Tadros Interior Design Portfolio |

The inspected non-Adobe font files carry SIL Open Font License identifiers. Font copyright notices and OFL texts have been included in the downloadable packages. Google-hosted Lora/Poppins are open-source fonts. Existing main CSS retains historical comparison names, including Kepler, Cofo Cinema and IvyEpic; shared final typography overrides those declarations. Avoid deleting a font solely because its name appears in old CSS.

Adobe web fonts must be served through Adobe’s embed codes under the appropriate active subscription. The user identified the Adobe projects as their own, but the account subscription and precise project-name-to-ID mapping were not independently verified in the Adobe account.

## Adobe cleanup order

1. Keep sis2ers (main portfolio), bso8epk (M Furniture), and ikn7ubz (new interior portfolio).
2. Replace the new interior repository’s old index using the updated standalone package. Its current uploaded index still references leu5ftb and ufi2znp. The updated package and mirrored demo instead use ikn7ubz.
3. Check the published interior page after replacement, then remove/archive the older comparison projects only after searching every remaining public source for both old IDs. ufi2znp contains the Additional Heading Fonts families. leu5ftb serves Adobe Caslon Pro, Adobe Garamond Pro, Kepler Std Display and Minion Pro; its account project name still needs confirmation.
4. Rename the retained projects as above. Do not delete all projects and start again: this changes embed IDs and can break existing sites. Fern & Fell requires no paid Adobe project in its current form.

No Adobe projects were renamed, created or deleted during this check. The available Adobe connection does not manage existing projects, and the account-management sign-in page did not expose a usable form. This portion needs completion in the account’s Web Projects screen.

The public murale.html file redirects to M Furniture; it does not itself require a separate Murale font kit. Other old pages or private sketches may still refer to historical kits, so retain those until the replacement/search step is complete.

## Sketches and public visibility

All seven identified hosted sketches now have owner-only access and titles beginning “Private sketch”: main portfolio, layout study, interior portfolio, M Furniture, Fern & Fell, Elements Mobile Test and Elements Writing Trial. The two Elements prototypes were changed from public to private. They remain hosted for your own use; they were not deleted.

Adobe web projects supply fonts; they do not publish websites. Having an old Adobe project does not itself expose a sketch.

GitHub publication is separate. The account has both jtadros.githhub.io and julietadros.github.io public repositories; only the main portfolio source was audited in full. The older repository’s hosting status was not established. Main GitHub still contains cortollini-sample.html, so not every historical/sample file has been removed from public source. These are remaining visibility checks before claiming that only final pages are public.

The new interior repository is JulieTadros/JulieTadrosInteriorDesign. Its expected future Pages address is https://julietadros.github.io/JulieTadrosInteriorDesign/ ; that address has not been verified live. Downloaded instructions and links have been corrected to match the actual repository name. No GitHub source changes or new publishing were performed during this audit.

## Other rights still requiring source evidence

Font licensing does not clear photographs, artworks, furniture/product cutouts, moodboard reference images or work made under client/employer agreements. The new interior package contains 28 project image files and a vintage divider SVG whose individual publication permissions were not documented. The relief-artwork image’s source/photographer or generation provenance also needs confirmation. Equivalent provenance for imagery elsewhere in the main portfolio, M Furniture and Fern & Fell has not been comprehensively established. A credit alone does not establish permission.

## References

- Adobe web-font licensing: https://helpx.adobe.com/fonts/web/font-licensing/webfont-licensing.html
- Adobe project management: https://helpx.adobe.com/fonts/web/getting-and-using-fonts/managing-fonts.html
- OFL permissions and distribution: https://openfontlicense.org/ofl-faq/
- Google Fonts licence sources: https://github.com/google/fonts/tree/main/ofl
- Source Serif: https://github.com/adobe-fonts/source-serif
- STIX: https://github.com/stipub/stixfonts
