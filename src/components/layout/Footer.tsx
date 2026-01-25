/**
 * Footer Component
 * 
 * @author Diogo Devitte
 * @company Ranktop SEO Inteligente
 * @website https://ranktop.com.br
 * @contact (51) 991227114
 * 
 * © 2026 Ranktop SEO Inteligente. Todos os direitos reservados.
 */

export default function Footer() {
  return (
    <footer className="border-t border-border bg-card py-4 px-4 lg:px-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="text-sm text-muted-foreground">
          © 2026. Criado e operado com{' '}
          <strong className="text-destructive">♥</strong> por{' '}
          <a
            href="https://ranktop.com.br"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center hover:opacity-80 transition-opacity"
          >
            <img
              src="https://ik.imagekit.io/oespecialisaseo/Logo%20RANKTOP%20cropped.png"
              width={100}
              alt="Ranktop – SEO, Tecnologia, Automação e Inteligência Artificial aplicadas a negócios."
              className="inline-block align-middle"
            />
          </a>
          .
        </span>

        <span className="text-xs text-muted-foreground max-w-2xl">
          Projeto construído com tecnologias de nuvem, banco de dados e inteligência artificial, 
          incluindo serviços de edge computing, plataformas low-code e modelos de IA generativa.
          <br />
          Recursos visuais licenciados por{' '}
          <a
            href="https://www.freepikcompany.com/legal"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground transition-colors"
          >
            Freepik
          </a>
          ,{' '}
          <a
            href="https://www.freepikcompany.com/legal#nav-flaticon"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground transition-colors"
          >
            Flaticon
          </a>
          ,{' '}
          <a
            href="https://fontawesome.com/license/free"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground transition-colors"
          >
            FontAwesome
          </a>{' '}
          e{' '}
          <a
            href="https://lottiefiles.com/page/terms-and-conditions"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground transition-colors"
          >
            LottieFiles
          </a>
          .
        </span>
      </div>
    </footer>
  );
}
