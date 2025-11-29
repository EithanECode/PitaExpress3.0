import { NextResponse } from 'next/server';
// @ts-ignore
import { translate } from 'google-translate-api-x';

export async function POST(request: Request) {
    try {
        const { text, targetLang } = await request.json();

        if (!text || !targetLang) {
            return NextResponse.json(
                { error: 'Text and targetLang are required' },
                { status: 400 }
            );
        }

        // Mapear códigos de idioma si es necesario
        // Google Translate suele preferir zh-CN o zh-TW en lugar de solo zh
        const finalTargetLang = targetLang === 'zh' ? 'zh-CN' : targetLang;

        // Realizar la traducción
        const res = await translate(text, {
            to: finalTargetLang,
            forceTo: true // Forzar traducción incluso si el ISO no es estándar estricto
        });

        return NextResponse.json({
            original: text,
            translated: res.text,
            from: res.from.language.iso,
            to: targetLang
        });

    } catch (error: any) {
        console.error('Translation error:', error);
        return NextResponse.json(
            { error: 'Translation failed', details: error.message },
            { status: 500 }
        );
    }
}
