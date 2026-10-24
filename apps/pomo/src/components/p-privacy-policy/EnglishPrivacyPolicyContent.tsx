import {Show} from 'solid-js'

import {
  PServicePolicyDocument,
  type ServicePolicyContentsItem,
} from '../p-service-policy-document/PServicePolicyDocument'
import {
  CARD_CLASSES,
  CARD_HEADING_CLASSES,
  CONTENT_LINK_CLASSES,
  HEADING_CLASSES,
  LIST_CLASSES,
  PARAGRAPH_CLASSES,
  type PPrivacyPolicyProps,
  SECTION_CLASSES,
} from '../privacy-policy/shared'

const BUSINESS_NAME = 'Kuwoong'
const REPRESENTATIVE = 'Bichi Kim'
const SUPPORT_EMAIL = 'info@pomofi.io'
const SUPPORT_PHONE = '070-5236-4741'

const CONTENT_ITEMS = [
  {id: 'controller', label: '1. Data controller'},
  {id: 'data', label: '2. Personal data categories and purposes'},
  {id: 'local-data', label: '3. Device-only data'},
  {id: 'retention', label: '4. Processing and retention'},
  {id: 'sharing', label: '5. Provision to third parties'},
  {id: 'processors', label: '6. Processing by service providers'},
  {id: 'overseas', label: '7. International transfers'},
  {id: 'rights', label: '8. User rights'},
  {id: 'deletion', label: '9. Destruction'},
  {id: 'automatic', label: '10. Automatic collection and security'},
  {id: 'children', label: '11. Children under 14'},
  {id: 'contact', label: '12. Contact and changes'},
] as const satisfies ReadonlyArray<ServicePolicyContentsItem>

// oxlint-disable-next-line eslint/max-lines-per-function -- Keep the legal document in reading order.
export const EnglishPrivacyPolicyContent = (props: PPrivacyPolicyProps) => {
  const isAppsInToss = () => props.platform === 'apps-in-toss'

  return (
    <PServicePolicyDocument
      backHref={props.backHref}
      backLabel={props.backLabel}
      contents={CONTENT_ITEMS}
      contentsLabel="Privacy policy contents"
      contentsTitle="Contents"
      currentPolicy="privacy"
      description={
        <>
          Kuwoong processes Pomofi users&apos; personal data only as needed and protects it with
          appropriate safeguards.
        </>
      }
      eyebrow={isAppsInToss() ? 'Apps in Toss privacy policy' : 'Web privacy policy'}
      footer={
        <>
          <span>
            Privacy inquiries:{' '}
            <a class={CONTENT_LINK_CLASSES} href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>
          </span>
          <span>© Pomofi</span>
        </>
      }
      metadata={
        <>
          <p class="mb-0 mt-3 text-xs text-#a99cab">
            Effective date: September 13, 2026 · Document version 1.2
          </p>
          <p class="mb-0 mt-3 text-xs text-#a99cab">
            Revision: clarified Google Calendar purposes, retention, deletion, and limited-use
            requirements (version 1.1: August 22, 2026)
          </p>
        </>
      }
      notice={{
        description: (
          <>
            Dialogue scripts, audio generated on the device, and focus settings are not currently
            uploaded to the server. The server processes identification and session information
            needed to operate accounts. If Google Calendar is connected, account connection data and
            events for the requested period are processed to provide calendar features.
          </>
        ),
        title: 'Key information',
      }}
      platform={props.platform ?? 'web'}
      title="Pomofi privacy policy"
    >
      <>
        <section class={SECTION_CLASSES} id="controller">
          <h2 class={HEADING_CLASSES}>1. Data controller</h2>
          <ul class={LIST_CLASSES}>
            <li>Business name: {BUSINESS_NAME}</li>
            <li>Representative: {REPRESENTATIVE}</li>
            <li>
              Privacy inquiries:{' '}
              <a class={CONTENT_LINK_CLASSES} href={`mailto:${SUPPORT_EMAIL}`}>
                {SUPPORT_EMAIL}
              </a>
            </li>
            <li>Phone: {SUPPORT_PHONE}</li>
          </ul>
        </section>

        <section class={SECTION_CLASSES} id="data">
          <h2 class={HEADING_CLASSES}>2. Personal data categories and purposes</h2>
          <Show
            fallback={
              <div class={CARD_CLASSES}>
                <h3 class={CARD_HEADING_CLASSES}>Web account</h3>
                <p class={PARAGRAPH_CLASSES}>
                  Email address, Neon Auth member identifier, internal user ID, login cookies, and
                  session information are processed to identify members, maintain login, secure
                  accounts, and provide customer support.
                </p>
              </div>
            }
            when={isAppsInToss()}
          >
            <div class={CARD_CLASSES}>
              <h3 class={CARD_HEADING_CLASSES}>Apps in Toss account</h3>
              <p class={PARAGRAPH_CLASSES}>
                The app-specific user identifier (userKey) provided by Toss, internal user ID,
                sign-in provider, and hashes of the app session token and its creation, expiration,
                recent-use, and revocation times are processed to identify members, maintain login,
                secure accounts, and provide customer support.
              </p>
            </div>
          </Show>

          <div class={CARD_CLASSES}>
            <h3 class={CARD_HEADING_CLASSES}>Optional Google Calendar connection</h3>
            <p class={PARAGRAPH_CLASSES}>
              When a user allows the connection in the Google permission screen, Pomofi processes
              the Google account identifier and email address, calendar identifiers and names, and
              event identifiers, titles, start and end times, and all-day status for the requested
              period. Google account information identifies and displays the connected account.
              Event information is used for the in-app calendar, event reminders, and answers to
              calendar questions. Calendar access is read-only; Pomofi does not create, edit, or
              delete events.
            </p>
            <p class={PARAGRAPH_CLASSES}>
              Access and refresh tokens used to keep the connection are encrypted and stored in the
              server database with the account connection data. Events are queried through the
              server when requested and may be temporarily stored in browser session storage. An AI
              model running on the user&apos;s device is used to answer calendar questions, and
              Google user data is not used to train general-purpose AI or machine-learning models.
            </p>
            <p class={PARAGRAPH_CLASSES}>
              Google user data and data derived from it are used only to provide or improve the
              features shown in the app. They are not used for advertising, retargeting, credit
              assessment, loan review, data sales, or purposes unrelated to app features.
            </p>
            <p class={PARAGRAPH_CLASSES}>
              Use of information received through Pomofi&apos;s Google API and transfers to other
              apps comply with the{' '}
              <a
                class={CONTENT_LINK_CLASSES}
                href="https://developers.google.com/terms/api-services-user-data-policy"
              >
                Google API Services User Data Policy
              </a>
              , including its Limited Use requirements. These requirements take precedence over the
              general sharing information below for Google user data. Transfers to third parties are
              limited to providing or improving an app feature with user consent, security, legal
              obligations, or a merger, acquisition, or asset sale with prior consent. Human access
              to data is limited to explicit user consent, security needs, legal obligations, or
              internal operations using aggregated data as permitted by law.
            </p>
            <p class={PARAGRAPH_CLASSES}>
              Disconnecting the connection in Calendar settings deletes the stored account
              connection data and tokens. Access can also be revoked through connected-app
              management in the Google account. Calendar reminders or dialogue containing calendar
              information can be removed by deleting the item or browser storage.
            </p>
          </div>

          <div class={CARD_CLASSES}>
            <h3 class={CARD_HEADING_CLASSES}>Optional account connection</h3>
            <p class={PARAGRAPH_CLASSES}>
              When a web account and an Apps in Toss account are connected, email address, email
              hash, authentication-token hash, and expiration and use times are processed to verify
              identity and prevent duplicate connections.
            </p>
          </div>
          <div class={CARD_CLASSES}>
            <h3 class={CARD_HEADING_CLASSES}>Music purchases</h3>
            <p class={PARAGRAPH_CLASSES}>
              Order and payment identifiers, purchased songs or albums, payment and refund status,
              and processing times may be processed to provide purchase rights, restore purchases,
              handle refunds and disputes, and retain legally required transaction records. Pomofi
              does not directly store card or bank-account numbers.
            </p>
          </div>
          <div class={CARD_CLASSES}>
            <h3 class={CARD_HEADING_CLASSES}>Service access</h3>
            <p class={PARAGRAPH_CLASSES}>
              IP address, browser and operating-system information, access time, request records,
              and error records may be generated automatically to provide the service, respond to
              failures, prevent abuse, and maintain security.
            </p>
          </div>
          <div class={CARD_CLASSES}>
            <h3 class={CARD_HEADING_CLASSES}>External content and runtime requests</h3>
            <p class={PARAGRAPH_CLASSES}>
              When downloading music, AI models, or voice runtime files, the user&apos;s device may
              connect directly to storage.pomofi.io (Cloudflare R2), cdn.jsdelivr.net, or
              huggingface.co. IP address, browser and device information, request time, and request
              or referrer URL may be sent to each provider. The same type of access information may
              be sent to the operator of a feed added by the user.
            </p>
            <p class={PARAGRAPH_CLASSES}>
              Account identifiers, user-written dialogue, and audio generated on the device are not
              included in these resource requests.
            </p>
          </div>
          <p class={PARAGRAPH_CLASSES}>
            Pomofi does not require resident registration numbers, biometric information, location
            information, or other unique or sensitive data. Pomofi does not make fully automated
            decisions that significantly affect a user&apos;s rights or obligations.
          </p>
        </section>

        <section class={SECTION_CLASSES} id="local-data">
          <h2 class={HEADING_CLASSES}>3. Device-only data</h2>
          <p class={PARAGRAPH_CLASSES}>
            Timer state and settings, display settings, dialogue scripts and drafts, audio generated
            on the device, feed subscriptions, and playback settings may be stored in browser
            storage, IndexedDB, Cache Storage, or Apps in Toss device storage. Pomofi&apos;s server
            does not currently upload or synchronize these contents to an account.
          </p>
          <p class={PARAGRAPH_CLASSES}>
            Users can delete these items in the service or remove device data by clearing browser or
            Toss app storage. Data may not be recoverable after changing a device or resetting its
            storage.
          </p>
        </section>

        <section class={SECTION_CLASSES} id="retention">
          <h2 class={HEADING_CLASSES}>4. Processing and retention</h2>
          <ul class={LIST_CLASSES}>
            <li>
              Account and member identifiers: until the relevant web or Apps in Toss account is
              deleted
            </li>
            <li>
              App login session: session token valid for up to 30 days; related records until
              account deletion
            </li>
            <li>
              Account connection credentials: until account deletion; connection tokens are valid
              for 30 minutes after issuance
            </li>
            <li>Service access and security records: generally within three months of creation</li>
            <li>Contract or withdrawal records: five years</li>
            <li>Payment and content-supply records: five years</li>
            <li>Consumer complaints or dispute records: three years</li>
            <li>Display and advertising records: six months</li>
          </ul>
          <p class={PARAGRAPH_CLASSES}>
            Transaction records retained under applicable law are separated from ordinary account
            information, used only for the legal purpose, and destroyed after the retention period
            ends.
          </p>
        </section>

        <section class={SECTION_CLASSES} id="sharing">
          <h2 class={HEADING_CLASSES}>5. Provision to third parties</h2>
          <p class={PARAGRAPH_CLASSES}>
            Kuwoong does not sell users&apos; personal data to third parties. Data may be provided
            to the necessary extent with the user&apos;s consent or when specifically required by
            law.
          </p>
          <p class={PARAGRAPH_CLASSES}>
            Toss, Google Play, and Apple process information as sign-in or payment platform
            operators under their own privacy policies.
          </p>
          <p class={PARAGRAPH_CLASSES}>
            External resources described in Article 2 and feeds selected by users are requested
            directly from the user&apos;s device. Those providers may process access information
            under their own privacy policies.
          </p>
        </section>

        <section class={SECTION_CLASSES} id="processors">
          <h2 class={HEADING_CLASSES}>6. Processing by service providers</h2>
          <ul class={LIST_CLASSES}>
            <li>
              Neon, LLC: PostgreSQL database, web member authentication, and authentication emails
            </li>
            <li>Vercel Inc.: web and API hosting, network delivery, access and error records</li>
            <li>Cloudflare, Inc.: R2-based music and AI-model storage and content delivery</li>
          </ul>
          <p class={PARAGRAPH_CLASSES}>
            Kuwoong manages necessary privacy safeguards through processing agreements, including
            purpose limitation, security measures, subcontractor management, and destruction of
            personal data.
          </p>
        </section>

        <section class={SECTION_CLASSES} id="overseas">
          <h2 class={HEADING_CLASSES}>7. International transfers</h2>
          <p class={PARAGRAPH_CLASSES}>
            To provide the database, authentication, and hosting needed to perform the service
            contract, personal data is transferred to and stored outside Korea under Article
            28-8(1)(3) of the Personal Information Protection Act.
          </p>
          <div class={CARD_CLASSES}>
            <h3 class={CARD_HEADING_CLASSES}>Neon, LLC</h3>
            <ul class={LIST_CLASSES}>
              <li>Country and contact: Singapore, privacy@neon.tech</li>
              <li>
                Data: account identifiers, email verification data, session hashes, purchase and
                refund records, Google account connection data, and encrypted tokens
              </li>
              <li>Purpose: database storage, member authentication, and authentication emails</li>
              <li>
                Timing and method: periodically over an encrypted network while using the service
              </li>
              <li>
                Period: the category-specific period in Article 4 or until the processing agreement
                ends
              </li>
            </ul>
          </div>
          <div class={CARD_CLASSES}>
            <h3 class={CARD_HEADING_CLASSES}>Vercel Inc.</h3>
            <ul class={LIST_CLASSES}>
              <li>Country and contact: United States, privacy@vercel.com</li>
              <li>
                Data: IP address, access, request, and error records, account and session data
                included in service requests, and information needed for Google Calendar connection
                and event lookup
              </li>
              <li>
                Purpose: web and API hosting, service delivery, failure response, and security
              </li>
              <li>
                Timing and method: periodically over an encrypted network when accessing the service
                or API
              </li>
              <li>
                Period: the category-specific period in Article 4 or until the processing agreement
                ends
              </li>
            </ul>
          </div>
          <div class={CARD_CLASSES}>
            <h3 class={CARD_HEADING_CLASSES}>Cloudflare, Inc.</h3>
            <ul class={LIST_CLASSES}>
              <li>
                Country and contact: United States and the global Cloudflare network,
                privacyquestions@cloudflare.com
              </li>
              <li>
                Data: IP address, browser and device information, request time, and request or
                referrer URL
              </li>
              <li>
                Purpose: delivery of music and AI models stored in R2, network delivery, and
                security
              </li>
              <li>
                Timing and method: over an encrypted network when music or AI features are prepared
              </li>
              <li>
                Period: until the processing agreement ends or Cloudflare&apos;s related
                log-retention period ends
              </li>
            </ul>
          </div>
          <div class={CARD_CLASSES}>
            <h3 class={CARD_HEADING_CLASSES}>External AI resources and user-selected feeds</h3>
            <ul class={LIST_CLASSES}>
              <li>
                Providers and countries: Hugging Face, Inc. (United States), Volentio JSD&apos;s
                jsDelivr (United Kingdom and global CDN regions), and feed operators selected by the
                user
              </li>
              <li>
                Data: IP address, browser and device information, request time, and request or
                referrer URL
              </li>
              <li>
                Purpose: delivery and security for AI models, voice runtime files, or feed content
                requested by the user
              </li>
              <li>
                Timing and method: directly from the user&apos;s device over an encrypted network
                when the feature is used
              </li>
              <li>Period: each provider&apos;s privacy policy and log-retention policy</li>
            </ul>
            <p class={PARAGRAPH_CLASSES}>
              Users who do not want external AI-resource transfers can avoid using the relevant AI
              feature. Users who do not want feed transfers can avoid adding a feed or delete a
              saved feed.
            </p>
          </div>
          <p class={PARAGRAPH_CLASSES}>
            Users who do not want international transfers may avoid registration and login or
            request account deletion. Without international transfers, account, purchase
            restoration, and online support features cannot be used, but device-only features
            available without login remain available.
          </p>
        </section>

        <section class={SECTION_CLASSES} id="rights">
          <h2 class={HEADING_CLASSES}>Rights of users and legal representatives</h2>
          <p class={PARAGRAPH_CLASSES}>
            Users may request access, correction, deletion, restriction of processing, withdrawal of
            consent, and account deletion for their personal data. Pomofi may request the minimum
            information needed to verify identity. Legal representatives and authorized agents may
            exercise rights under applicable law.
          </p>
          <p class={PARAGRAPH_CLASSES}>
            Web and Apps in Toss accounts are managed separately and may be deleted separately.
            Requests can be sent to{' '}
            <a class={CONTENT_LINK_CLASSES} href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>
            . Kuwoong handles them within the period and by the method required by applicable law.
          </p>
        </section>

        <section class={SECTION_CLASSES} id="deletion">
          <h2 class={HEADING_CLASSES}>9. Destruction</h2>
          <p class={PARAGRAPH_CLASSES}>
            Personal data is destroyed without delay when its retention period ends or its purpose
            is achieved. Electronic files are deleted in a way that cannot be restored; paper
            documents, if any, are shredded or incinerated.
          </p>
          <p class={PARAGRAPH_CLASSES}>
            Data that must be retained under law is separated into dedicated storage and destroyed
            after the legal retention period.
          </p>
        </section>

        <section class={SECTION_CLASSES} id="automatic">
          <h2 class={HEADING_CLASSES}>10. Automatic collection and security</h2>
          <p class={PARAGRAPH_CLASSES}>
            Essential cookies may be used to maintain web login and security. Apps in Toss stores an
            app session token in device storage. Blocking cookies in the browser or deleting app
            storage is possible, but login may not work correctly. Tracking cookies for targeted
            advertising are not used.
          </p>
          <p class={PARAGRAPH_CLASSES}>
            Kuwoong applies safeguards against loss, theft, disclosure, alteration, and damage,
            including encryption in transit, hashed authentication information, limited access
            permissions, security updates, and access-log review.
          </p>
        </section>

        <section class={SECTION_CLASSES} id="children">
          <h2 class={HEADING_CLASSES}>11. Personal data of children under 14</h2>
          <p class={PARAGRAPH_CLASSES}>
            Pomofi does not provide the service to or collect personal data from children under 14.
            If Pomofi confirms that a child&apos;s data was processed, it will take the necessary
            action at the request of the child or legal representative.
          </p>
        </section>

        <section class={SECTION_CLASSES} id="contact">
          <h2 class={HEADING_CLASSES}>12. Privacy inquiries and policy changes</h2>
          <ul class={LIST_CLASSES}>
            <li>Privacy officer: {REPRESENTATIVE}</li>
            <li>
              Email:{' '}
              <a class={CONTENT_LINK_CLASSES} href={`mailto:${SUPPORT_EMAIL}`}>
                {SUPPORT_EMAIL}
              </a>
            </li>
            <li>Phone: {SUPPORT_PHONE}</li>
          </ul>
          <p class={PARAGRAPH_CLASSES}>
            This policy may be revised when processing practices or applicable law changes.
            Important changes are announced through the service before taking effect, and previous
            versions and effective dates are maintained for review.
          </p>
        </section>
      </>
    </PServicePolicyDocument>
  )
}
