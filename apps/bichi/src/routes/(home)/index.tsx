import {clientOnly} from '@solidjs/start'
import {
  ContactLinks,
  ContentWrapper,
  HeroNameSvg,
  OutlineButton,
  ProgressLine,
  ScrollContent,
  Section,
  SectionParagraph,
  SectionTitle,
  SectionTitleArrow,
  SectionTitleNumber,
} from './_components'

const ScrollStage = clientOnly(() =>
  import('../../components/scroll-stage/ScrollStage').then((m) => ({
    default: m.ScrollStage,
  })),
)

let contentRef: HTMLElement | undefined

export default function HomePage() {
  return (
    <>
      <ContentWrapper
        ref={(element) => {
          contentRef = element
        }}
      >
        <ScrollContent>
          <Section>
            <SectionTitleNumber number="00" />
            <SectionTitle dataSectionTitle="Bichi Kim">
              <HeroNameSvg />
            </SectionTitle>
            <SectionTitleArrow />
            <SectionParagraph>Senior Front-end Developer</SectionParagraph>
            <ContactLinks />
          </Section>

          <Section>
            <SectionTitleNumber number="01" />
            <SectionTitle>About</SectionTitle>
            <SectionTitleArrow />
            <SectionParagraph>
              Based on front-end and back-end experience, I work as a senior front-end developer. I dislike the
              irrational and like automation and high efficiency. I'm not perfect but keep reflecting and improving.
              Lately I'm learning AI and preparing for the next step; my goal is to contribute meaningfully through a
              venture someday.
            </SectionParagraph>
            <OutlineButton href="https://bichi.kim/" external class="mt-8">
              Learn more
            </OutlineButton>
          </Section>

          <Section>
            <SectionTitleNumber number="02" />
            <SectionTitle>Work</SectionTitle>
            <SectionTitleArrow />
            <SectionParagraph>
              Full-stack JavaScript and functional programming. I treat testing and documentation as part of development
              and work with TDD. My Notion holds how I work: problem-solving process, retrospectives, postmortems, Slack
              discussions, and databases (Projects, HR, Articles, Links, Files, Design).
            </SectionParagraph>
            <div class="mt-8 flex flex-wrap gap-3">
              <OutlineButton href="https://coong.io" external>
                coong.io
              </OutlineButton>
              <OutlineButton href="https://web-storybook-5c4ehvuys-bichis-projects.vercel.app/" external>
                components
              </OutlineButton>
              <OutlineButton href="https://deploy-chronicles.vercel.app/" external>
                AI review bot slides
              </OutlineButton>
            </div>
          </Section>

          <Section>
            <SectionTitleNumber number="03" />
            <SectionTitle>Contact</SectionTitle>
            <SectionTitleArrow />
            <SectionParagraph>
              My docs (Notion), GitHub, pet project (Coong.io), and component Storybook — all linked in one place.
            </SectionParagraph>
            <OutlineButton href="https://github.com/bichikim" external class="mt-8">
              GitHub
            </OutlineButton>
          </Section>
        </ScrollContent>

        <ProgressLine />
      </ContentWrapper>

      <ScrollStage contentRef={() => contentRef} fallback={null} />
    </>
  )
}
