"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, Users, Ticket, MapPin, Play, Loader2 } from "lucide-react";
import { realizarSorteioAction } from "./actions"; // Assuming this exists or will be adapted
import { cn } from "@/lib/utils";

// Mock Data for Units
const UNITS = [
    { name: "Loja 1 Centro", id: 1 },
    { name: "Loja 2 Norte", id: 2 },
    { name: "Loja 3 Sul", id: 3 },
    { name: "Loja 4 Leste", id: 4 },
    { name: "Loja 5 Oeste", id: 5 },
    { name: "Loja 6 Industrial", id: 6 },
    { name: "Loja 7 Shopping", id: 7 },
    { name: "Loja 8 Express", id: 8 },
];

interface RaffleScreenProps {
    totalCuponsElegiveis: number | null;
}

export function RaffleScreen({ totalCuponsElegiveis }: RaffleScreenProps) {
    const [status, setStatus] = useState<"idle" | "counting" | "finished">("idle");
    const [countdown, setCountdown] = useState(10);
    const [winner, setWinner] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (status === "counting" && countdown > 0) {
            timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        } else if (status === "counting" && countdown === 0) {
            handleFinishRaffle();
        }
        return () => clearTimeout(timer);
    }, [status, countdown]);

    const handleStartRaffle = () => {
        setStatus("counting");
        setCountdown(10);
        setError(null);
        setWinner(null);
    };

    const handleFinishRaffle = async () => {
        try {
            // Simulate or Call Action
            // Check if action exists, otherwise mock for now based on previous SorteioForm
            const result = await realizarSorteioAction(1);

            if (result.success && result.cuponsSorteados && result.cuponsSorteados.length > 0) {
                setWinner(result.cuponsSorteados[0]);
                setStatus("finished");
            } else {
                throw new Error(result.message || "Erro ao sortear.");
            }
        } catch (err: any) {
            setError(err.message || "Erro desconhecido.");
            setStatus("idle");
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8 font-sans">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-black text-[#1e3a8a] tracking-tight uppercase">
                    Grande Sorteio Anual
                </h1>
                <div className="flex items-center gap-4">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Sessão Ativa
                    </span>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#1e3a8a]">
                            Administrador Principal
                        </span>
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                            <span className="text-xs">👤</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Hero Card */}
            <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden mb-8 relative">
                <CardContent className="p-12 relative z-10 flex flex-col md:flex-row items-center justify-between min-h-[500px]">

                    {/* Left Content */}
                    <div className="md:w-1/2 space-y-8">
                        <Badge variant="secondary" className="bg-red-50 text-red-600 px-4 py-1 mb-4 rounded-full font-bold tracking-wide">
                            ★ DESTAQUE PREMIUM
                        </Badge>

                        <div>
                            <h2 className="text-6xl font-black text-[#1e3a8a] leading-tight mb-2">
                                Prêmio Principal:<br />
                                <span className="text-[#ef4444]">Fiat Mobi 0km</span>
                            </h2>
                            <p className="text-xl text-gray-500 max-w-md">
                                O carro mais amado do Brasil pode ser seu.
                                Sistema pronto para iniciar a rodada final.
                            </p>
                        </div>

                        {/* Status / Countdown Display */}
                        <div className="flex items-center gap-6 mt-12">
                            <div className="relative w-20 h-20 flex items-center justify-center">
                                {/* Decorative Circle */}
                                <div className={cn("absolute inset-0 border-4 border-red-200 rounded-full", status === 'counting' && "animate-ping")}></div>
                                {status === 'counting' ? (
                                    <span className="text-3xl font-bold text-red-600">{countdown}</span>
                                ) : (
                                    <Award className="w-10 h-10 text-red-500" />
                                )}
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                                    STATUS DO SORTEIO
                                </p>
                                <p className="text-2xl font-black text-gray-700">
                                    {status === 'idle' && "AGUARDANDO INÍCIO"}
                                    {status === 'counting' && "ESCANEANDO DADOS..."}
                                    {status === 'finished' && "VENCEDOR ENCONTRADO!"}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Right Content - Car Image */}
                    <div className="md:w-1/2 relative h-full flex justify-center items-center">
                        {/* Background Decoration */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-gray-100 to-transparent rounded-full opacity-50 blur-3xl transform translate-x-10 translate-y-10"></div>

                        {/* Car Image Placeholder */}
                        <div className="relative z-10 w-full max-w-lg aspect-video rounded-2xl overflow-hidden shadow-2xl bg-gray-100 flex items-center justify-center">
                            {/* Use the downloaded image if available, else fallback */}
                            <Image
                                src="/img/fiat-mobi.png"
                                alt="Fiat Mobi 0km"
                                fill
                                className="object-cover"
                                onError={(e) => {
                                    // Fallback logic if needed, visually handled by container
                                    e.currentTarget.style.display = 'none';
                                }}
                            />

                            {/* Overlay Badge */}
                            <div className="absolute bottom-6 left-6 bg-[#ef4444] text-white px-4 py-2 font-bold text-sm rounded-md shadow-lg">
                                FIAT MOBI 2024
                            </div>
                        </div>
                    </div>

                </CardContent>
            </Card>

            {/* Control Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Participants - Mocked */}
                <Card className="bg-[#1e3a8a] text-white border-none shadow-lg rounded-2xl">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-xs opacity-70 font-semibold uppercase tracking-wider mb-1">Clientes Participantes</p>
                            <p className="text-4xl font-black">20.000</p>
                        </div>
                        <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center">
                            <Users className="w-6 h-6 text-white" />
                        </div>
                    </CardContent>
                </Card>

                {/* Coupons */}
                <Card className="bg-white border-none shadow-lg rounded-2xl">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Cupons Gerados</p>
                            <p className="text-4xl font-black text-[#1e3a8a]">
                                {totalCuponsElegiveis ? totalCuponsElegiveis.toLocaleString('pt-BR') : "142.859"}
                            </p>
                        </div>
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                            <Ticket className="w-6 h-6 text-gray-500" />
                        </div>
                    </CardContent>
                </Card>

                {/* Action Button */}
                <Card className="border-none shadow-lg rounded-2xl flex items-center justify-center p-2 bg-white">
                    <Button
                        size="lg"
                        className={cn(
                            "w-full h-full text-xl font-bold rounded-xl transition-all duration-300",
                            status === 'idle'
                                ? "bg-[#ef4444] hover:bg-red-600 text-white shadow-red-200 shadow-xl"
                                : "bg-gray-200 text-gray-400 cursor-not-allowed"
                        )}
                        onClick={handleStartRaffle}
                        disabled={status !== 'idle' || !totalCuponsElegiveis}
                    >
                        {status === 'idle' ? "INICIAR SORTEIO" : "PROCESSANDO..."}
                    </Button>
                </Card>
            </div>

            {/* Winner Reveal Modal / Section */}
            {status === 'finished' && winner && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl text-center space-y-8 animate-in zoom-in-50 duration-500 slide-in-from-bottom-10">
                        <Award className="w-24 h-24 text-yellow-500 mx-auto animate-bounce" />
                        <div>
                            <h2 className="text-5xl font-black text-[#1e3a8a] mb-2">TEMOS UM GANHADOR!</h2>
                            <p className="text-xl text-gray-500">Parabéns ao novo proprietário do Fiat Mobi 0km</p>
                        </div>

                        <div className="bg-gray-50 p-8 rounded-2xl border-2 border-dashed border-gray-200">
                            <div className="grid grid-cols-2 gap-4 text-left">
                                <div>
                                    <p className="text-xs text-gray-400 uppercase font-bold">Nome do Cliente</p>
                                    <p className="text-2xl font-bold text-gray-800">{winner.nome_cliente || "Cliente Anônimo"}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 uppercase font-bold">Número da Nota</p>
                                    <p className="text-2xl font-bold text-gray-800">{winner.num_nota}</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-xs text-gray-400 uppercase font-bold">ID do Cupom</p>
                                    <p className="text-xl font-mono text-gray-600">#{winner.id}</p>
                                </div>
                            </div>
                        </div>

                        <Button
                            size="lg"
                            className="w-full bg-[#1e3a8a] hover:bg-blue-900 text-white font-bold"
                            onClick={() => setStatus('idle')}
                        >
                            REALIZAR NOVO SORTEIO
                        </Button>
                    </div>
                </div>
            )}

            {/* Footer Units */}
            <div className="mt-12 bg-white rounded-3xl p-8 shadow-lg">
                <h3 className="text-lg font-bold text-[#1e3a8a] mb-6 flex items-center">
                    UNIDADES PARTICIPANTES (8)
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                    {UNITS.map(unit => (
                        <div key={unit.id} className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                            <MapPin className="w-6 h-6 text-gray-400 mb-2" />
                            <p className="text-xs font-bold text-gray-600 text-center leading-tight">
                                {unit.name.split(' ').map((line, i) => (
                                    <span key={i} className="block">{line}</span>
                                ))}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
