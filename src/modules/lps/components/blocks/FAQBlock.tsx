/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { PageBlock } from '@/modules/lps/hooks/useBlocks';
import { renderContent } from '@/modules/lps/lib/markdown';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQBlockProps {
  block: PageBlock;
  primaryColor?: string;
}

export function FAQBlock({ block, primaryColor = 'hsl(var(--secondary))' }: FAQBlockProps) {
  // Try to get FAQs from settings or parse from content
  let faqs: FAQItem[] = (block.settings as { faqs?: FAQItem[] })?.faqs || [];
  
  // If faqs empty but content exists, try parsing content as JSON array
  if (faqs.length === 0 && block.content) {
    try {
      const parsed = JSON.parse(block.content);
      if (Array.isArray(parsed)) {
        faqs = parsed;
      }
    } catch {
      // Content is not JSON, ignore
    }
  }

  return (
    <section 
      className="py-16 px-4"
      style={{ backgroundColor: block.background_color || 'hsl(var(--primary-foreground))' }}
    >
      <div className="max-w-3xl mx-auto">
        {block.title && (
          <h2 
            className="text-3xl font-bold mb-12 text-center"
            style={{ color: block.text_color || primaryColor }}
          >
            {block.title}
          </h2>
        )}
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger 
                className="text-left font-semibold hover:no-underline"
                style={{ color: primaryColor }}
              >
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                <div dangerouslySetInnerHTML={{ __html: renderContent(faq.answer) }} />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
