import json
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

def parse_email_content(email_body: str) -> Optional[EmailParsedData]:
    """
    Usa a API do Google Gemini para extrair dados estruturados de um corpo de e-mail bruto.
    Garante que os dados estejam tipados validando a saída JSON.
    """
    if not settings.GEMINI_API_KEY:
        logger.error("GEMINI_API_KEY não configurada.")
        return None

    genai.configure(api_key=settings.GEMINI_API_KEY)
    
    # Utilizando o gemini-1.5-flash-latest
    model = genai.GenerativeModel('gemini-1.5-flash-latest', generation_config={"response_mime_type": "application/json"})
    
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
    
    try:
        response = model.generate_content(prompt)
        content = response.text
        parsed_dict = json.loads(content)
        
        # Validar através do Pydantic para garantir que o Gemini retornou os tipos corretos
        data = EmailParsedData(**parsed_dict)
        return data
        
    except Exception as e:
        logger.error(f"Erro ao fazer parsing com IA Gemini: {e}")
        return None
