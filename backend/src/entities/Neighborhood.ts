import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('neighborhoods')
export class Neighborhood {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @Column({ type: "varchar" })
  name: string;

  // GeoJSON polygon stored as JSONB
  @Column({ type: 'jsonb' })
  boundaries: {
    type: 'Polygon';
    coordinates: number[][][];
  };

  // Centroid for distance calculations
  @Column({ type: 'float' })
  centroidLat: number;

  @Column({ type: 'float' })
  centroidLng: number;

  @CreateDateColumn()
  createdAt: Date;

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      boundaries: this.boundaries,
      centroid: {
        lat: this.centroidLat,
        lng: this.centroidLng,
      },
    };
  }
}
