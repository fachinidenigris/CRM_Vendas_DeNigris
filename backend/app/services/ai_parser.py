import json
import re
import google.generativeai as genai
from pydantic import BaseModel, Field
from typing import Optional
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class EmailParsedData(BaseModel):
    name: str = Field(description="O nome completo do lead. Se não for encontrado, extraia do email ou deixe como 'Lead Desconhecido'")
    email: str = Field(description="O e-mail de contato do lead")
    phone: Optional[str] = Field(None, description="O telefone de contato do lead, caso fornecido")
    company: Optional[str] = Field(None, description="A empresa do lead, se aplicável")
    product_interest: Optional[str] = Field(None, description="O produto, veículo ou serviço específico de interesse")
    city_region: Optional[str] = Field(None, description="A cidade ou estado, se mencionado")
    
    # Novos campos de qualificação comercial automotiva
    category: str = Field(description="Classifique em uma das 4 categorias exatas: 'Veículos Novos', 'Veículos Usados', 'Locação' ou 'Produtos Agregados'")
    subcategory: str = Field(description="Classifique em uma das seguintes subcategorias exatas: 'Caminhões Mercedes-Benz', 'Vans Mercedes-Benz', 'Caminhões usados', 'Vans usadas', 'Locação de Caminhões', 'Locação de Vans', 'Seguro', 'Consórcio', 'Plano de manutenção', 'Acessórios' ou 'Serviços financeiros'")
    client_type: str = Field("Autônomo", description="Identifique se o cliente é 'Autônomo' ou 'Frota' baseado nas características do e-mail.")
    tags: str = Field(description="Lista de tags separadas por vírgula apropriadas ao lead. Tags possíveis: 'urgente', 'frota', 'autonomo', 'alto potencial', 'renovacao', 'reativacao', 'cliente ativo', 'indicacao', 'concorrencia'")
    
    priority: str = Field("media", description="Classifique a prioridade baseada no tom (baixa, media, alta, critica)")
    urgency_level: Optional[str] = Field(None, description="Uma breve frase sobre a urgência do lead")
    ai_summary: str = Field(description="Um resumo de 1-2 frases do que o lead quer e possíveis oportunidades de cross-sell (ex: seguro, consórcio, plano de manutenção).")


def fallback_parse_email(email_body: str) -> EmailParsedData:
    """
    Parser determinístico heurístico (regex) utilizado como fallback imediato 
    quando a IA do Gemini falha (falta de créditos, rate limit ou indisponibilidade).
    Garante resiliência comercial absoluta (sem perda de Leads).
    """
    # 1. Tentar extrair do e-mail body usando padrões conhecidos
    
    # Extrair Nome
    # Tenta obter do assunto no formato: "Você possui um novo Lead - NOME - DATA"
    subject_match = re.search(r"Subject:\s*(?:ENC:|FWD:)?\s*Você possui um novo Lead\s*-\s*([^-]+)", email_body, re.IGNORECASE)
    # Tenta obter de assunto tipo: "Intenção de Compra Gerada - NOME [#id]"
    if not subject_match:
        subject_match = re.search(r"Subject:\s*(?:ENC:|FWD:)?\s*Intenção de Compra Gerada\s*-\s*([^\[#]+)", email_body, re.IGNORECASE)
    
    name = "Lead Desconhecido"
    if subject_match:
        name = subject_match.group(1).strip()
    else:
        # Se não achou no assunto, tenta no corpo
        body_name_match = re.search(r"(?:Nome|Lead|Cliente):\s*([^\n\r]+)", email_body, re.IGNORECASE)
        if body_name_match:
            name = body_name_match.group(1).strip()

    # Extrair Email
    email_match = re.search(r"(?:E-mail|Email|Mail):\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})", email_body, re.IGNORECASE)
    email = "email@desconhecido.com"
    if email_match:
        email = email_match.group(1).strip()
    else:
        # Tenta pegar qualquer e-mail no corpo
        all_emails = re.findall(r"([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})", email_body)
        # Filtra e-mails corporativos da De Nigris se houver mais de um
        filtered_emails = [e for e in all_emails if "denigris.com.br" not in e.lower() and "google.com" not in e.lower()]
        if filtered_emails:
            email = filtered_emails[0]
        elif all_emails:
            email = all_emails[0]

    # Extrair Telefone
    # Procura padrões de telefone BR: (XX) XXXXX-XXXX, XX XXXXX-XXXX, etc.
    phone_match = re.search(r"(?:Telefone|Celular|Whatsapp|Fone|Tel):\s*([^\n\r]+)", email_body, re.IGNORECASE)
    phone = None
    if phone_match:
        phone = phone_match.group(1).strip()
    else:
        # Tenta achar qualquer sequência que pareça telefone BR no texto
        phone_raw = re.search(r"(\(?\d{2}\)?\s*\d{4,5}[-\s]?\d{4})", email_body)
        if phone_raw:
            phone = phone_raw.group(1).strip()

    # Extrair Empresa
    company_match = re.search(r"(?:Empresa|Razão Social|Razao Social):\s*([^\n\r]+)", email_body, re.IGNORECASE)
    company = None
    if company_match:
        company = company_match.group(1).strip()

    # Extrair Veículo / Produto de Interesse
    product_match = re.search(r"(?:Produto|Veículo|Interesse|Veiculo|Interesse em):\s*([^\n\r]+)", email_body, re.IGNORECASE)
    product_interest = "Geral / Não especificado"
    if product_match:
        product_interest = product_match.group(1).strip()
    else:
        # Tenta procurar palavras chave comuns no texto do corpo
        body_lower = email_body.lower()
        if "sprinter" in body_lower:
            product_interest = "Sprinter (Vans)"
        elif "caminhão" in body_lower or "caminhao" in body_lower or "accelo" in body_lower or "atego" in body_lower or "actros" in body_lower:
            product_interest = "Caminhão Mercedes-Benz"
        elif "consórcio" in body_lower or "consorcio" in body_lower:
            product_interest = "Consórcio"
        elif "seguro" in body_lower:
            product_interest = "Seguro"
        elif "manutenção" in body_lower or "manutencao" in body_lower:
            product_interest = "Plano de Manutenção"

    # Extrair Cidade / Região
    city_match = re.search(r"(?:Cidade|Região|Estado|Regiao|UF):\s*([^\n\r]+)", email_body, re.IGNORECASE)
    city_region = None
    if city_match:
        city_region = city_match.group(1).strip()

    # Classificação Heurística de Categoria e Subcategoria
    category = "Veículos Novos"
    subcategory = "Caminhões Mercedes-Benz"
    body_lower = email_body.lower()
    
    if "locação" in body_lower or "locacao" in body_lower or "aluguel" in body_lower:
        category = "Locação"
        if "van" in body_lower or "sprinter" in body_lower:
            subcategory = "Locação de Vans"
        else:
            subcategory = "Locação de Caminhões"
    elif "usado" in body_lower or "semi-novo" in body_lower or "seminovo" in body_lower:
        category = "Veículos Usados"
        if "van" in body_lower or "sprinter" in body_lower:
            subcategory = "Vans usadas"
        else:
            subcategory = "Caminhões usados"
    elif "seguro" in body_lower or "consórcio" in body_lower or "consorcio" in body_lower or "manutenção" in body_lower or "manutencao" in body_lower or "serviços financeiros" in body_lower or "servicos financeiros" in body_lower or "acessório" in body_lower or "acessorio" in body_lower:
        category = "Produtos Agregados"
        if "seguro" in body_lower:
            subcategory = "Seguro"
        elif "consórcio" in body_lower or "consorcio" in body_lower:
            subcategory = "Consórcio"
        elif "manutenção" in body_lower or "manutencao" in body_lower:
            subcategory = "Plano de manutenção"
        elif "acessório" in body_lower or "acessorio" in body_lower:
            subcategory = "Acessórios"
        else:
            subcategory = "Serviços financeiros"
    else:
        # Padrão: Veículos Novos
        category = "Veículos Novos"
        if "van" in body_lower or "sprinter" in body_lower:
            subcategory = "Vans Mercedes-Benz"
        else:
            subcategory = "Caminhões Mercedes-Benz"

    # Classificação de Tipo de Cliente
    client_type = "Autônomo"
    if "cnpj" in body_lower or "frota" in body_lower or "empresa" in body_lower or "corporativo" in body_lower or company is not None:
        client_type = "Frota"

    # Tags e Prioridade
    tags = "autonomo" if client_type == "Autônomo" else "frota"
    if "urgente" in body_lower or "urgência" in body_lower or "urgencia" in body_lower or "rápido" in body_lower or "rapido" in body_lower:
        tags += ",urgente"
        priority = "alta"
        urgency_level = "Alta (Palavras de urgência detectadas no e-mail)"
    else:
        priority = "media"
        urgency_level = "Normal (Tempo de atendimento regular)"

    ai_summary = f"[PARSER FALLBACK: IA INDISPONÍVEL] Lead extraído por meio de regras estáticas locais devido a limite de cota da API Gemini."

    return EmailParsedData(
        name=name,
        email=email,
        phone=phone,
        company=company,
        product_interest=product_interest,
        city_region=city_region,
        category=category,
        subcategory=subcategory,
        client_type=client_type,
        tags=tags,
        priority=priority,
        urgency_level=urgency_level,
        ai_summary=ai_summary
    )


def parse_email_content(email_body: str) -> Optional[EmailParsedData]:
    """
    Usa a API do Google Gemini para extrair dados estruturados de um corpo de e-mail bruto.
    Se falhar (por ex: falta de créditos ou limitação de taxa), cai de volta para o parser heurístico estático.
    Garante resiliência absoluta sem parar a leitura comercial.
    """
    if not settings.GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY não configurada. Ativando parser heurístico local.")
        return fallback_parse_email(email_body)

    try:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        
        # Utilizando o gemini-2.5-flash
        model = genai.GenerativeModel('gemini-2.5-flash', generation_config={"response_mime_type": "application/json"})
        
        prompt = f"""
        Você é um assistente especialista em ler e-mails de leads comerciais de veículos comerciais e extrair os dados mais importantes para um sistema de CRM.
        Leia o seguinte corpo de e-mail e extraia os dados solicitados retornando um JSON que siga perfeitamente a estrutura abaixo.
        
        REGRAS DE CLASSIFICAÇÃO:
        - CATEGORIAS: Deve ser 'Veículos Novos', 'Veículos Usados', 'Locação' ou 'Produtos Agregados'.
        - SUBCATEGORIAS:
          * Se for caminhão novo MB -> 'Caminhões Mercedes-Benz'
          * Se for van nova MB -> 'Vans Mercedes-Benz'
          * Se for caminhão usado -> 'Caminhões usados'
          * Se for van usada -> 'Vans usadas'
          * Se for locação de caminhão -> 'Locação de Caminhões'
          * Se for locação de van -> 'Locação de Vans'
          * Se for seguro -> 'Seguro'
          * Se for consórcio -> 'Consórcio'
          * Se for plano de manutenção -> 'Plano de manutenção'
          * Se for acessórios -> 'Acessórios'
          * Se for serviços financeiros -> 'Serviços financeiros'
        - CLIENT_TYPE: 'Autônomo' ou 'Frota' (identifique se mencionam CNPJ, frotista, múltiplos veículos ou compras corporativas).
        - TAGS: Escolha dentre as tags separadas por vírgula: 'urgente', 'frota', 'autonomo', 'alto potencial', 'renovacao', 'reativacao', 'cliente ativo', 'indicacao', 'concorrencia'.
        
        Estrutura JSON Esperada:
        {{
            "name": "Nome do Lead",
            "email": "E-mail",
            "phone": "Telefone ou null",
            "company": "Empresa ou null",
            "product_interest": "Veículo ou produto de interesse",
            "city_region": "Cidade/Região ou null",
            "category": "Categoria comercial exata",
            "subcategory": "Subcategoria exata",
            "client_type": "Autônomo ou Frota",
            "tags": "tags,separadas,por,virgula",
            "priority": "baixa, media, alta, ou critica",
            "urgency_level": "Breve análise da urgência baseada no tom",
            "ai_summary": "Resumo objetivo incluindo sugestão de cross-sell pertinente (ex: oferecer seguro ou plano de manutenção para caminhões novos)"
        }}
        
        Email:
        {email_body}
        """
        
        response = model.generate_content(prompt)
        content = response.text
        parsed_dict = json.loads(content)
        
        # Validar através do Pydantic para garantir que o Gemini retornou os tipos corretos
        data = EmailParsedData(**parsed_dict)
        return data
        
    except Exception as e:
        logger.error(f"Erro ao fazer parsing com IA Gemini: {e}. Acionando fallback heurístico local.")
        try:
            return fallback_parse_email(email_body)
        except Exception as fallback_err:
            logger.error(f"Erro no fallback heurístico local: {fallback_err}")
            return None
