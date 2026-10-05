import React, { useState, useEffect } from 'react';
import { Star, MessageSquare, ThumbsUp, User } from 'lucide-react';
import { StorageService } from '../../services/storage';
import { Organization, Review } from '../../types';

interface ReviewsViewProps {
  organization: Organization;
}

export const ReviewsView: React.FC<ReviewsViewProps> = ({ organization }) => {
  const [reviews, setReviews] = useState<Review[]>([]);

  const loadData = () => {
    setReviews(StorageService.getReviews(organization.id));
  };

  useEffect(() => {
    loadData();
    const unsub = StorageService.subscribeToRealtimeEvents(() => {
      loadData();
    });
    return unsub;
  }, [organization.id]);

  const avgRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : '5.0';

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Star className="h-6 w-6 fill-current" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Avaliações & Opiniões de Clientes</h1>
            <p className="mt-1 text-xs text-slate-400">
              Feedback recebido automaticamente dos clientes após a conclusão dos atendimentos.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-800">
          <div className="text-2xl font-black text-amber-400 font-mono">{avgRating}</div>
          <div>
            <div className="flex text-amber-400">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className="h-3.5 w-3.5 fill-current" />
              ))}
            </div>
            <span className="text-[10px] text-slate-400 font-mono">{reviews.length} avaliações</span>
          </div>
        </div>
      </div>

      {/* Reviews Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {reviews.length === 0 ? (
          <div className="col-span-2 p-12 text-center text-xs text-slate-500 rounded-2xl bg-slate-900 border border-slate-800">
            Ainda não há avaliações registradas para este estabelecimento.
          </div>
        ) : (
          reviews.map((rev) => (
            <div
              key={rev.id}
              className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">{rev.customerName}</h4>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {rev.serviceName} · Barbeiro: {rev.professionalName}
                  </div>
                </div>

                <div className="flex text-amber-400">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`h-3.5 w-3.5 ${s <= rev.rating ? 'fill-current' : 'text-slate-700'}`}
                    />
                  ))}
                </div>
              </div>

              <p className="text-xs text-slate-300 italic bg-slate-950 p-3 rounded-xl border border-slate-850">
                "{rev.comment}"
              </p>

              <div className="text-[10px] text-slate-500 font-mono text-right">
                {new Date(rev.createdAt).toLocaleDateString('pt-BR')}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
