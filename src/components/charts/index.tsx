"use client";

import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
  AreaChart as RechartsAreaChart,
  Area,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Color palette — uses CSS custom properties so charts respond to theme changes
const COLORS = {
  primary: "hsl(var(--primary))",
  secondary: "hsl(var(--chart-2, 199 98% 43%))",
  success: "hsl(var(--chart-3, 142 76% 36%))",
  warning: "hsl(var(--chart-4, 38 92% 50%))",
  destructive: "hsl(var(--destructive))",
  muted: "hsl(var(--muted-foreground))",
};

const PIE_COLORS = [COLORS.primary, COLORS.secondary, COLORS.success, COLORS.warning, COLORS.destructive];

interface ChartCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function ChartCard({ title, description, children, className }: ChartCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

interface LineChartProps {
  data: Array<Record<string, string | number>>;
  dataKey: string;
  xAxisKey?: string;
  height?: number;
  color?: string;
  showGrid?: boolean;
  xAxisInterval?: number | "preserveStart" | "preserveEnd" | "preserveStartEnd" | "equidistantPreserveStart";
}

export function LineChart({
  data,
  dataKey,
  xAxisKey = "name",
  height = 300,
  color = COLORS.primary,
  showGrid = true,
  xAxisInterval,
}: LineChartProps) {
  // Auto-compute interval if not specified — skip labels when data is dense
  const interval = xAxisInterval ?? (data.length > 12 ? Math.ceil(data.length / 8) - 1 : 0);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />}
        <XAxis
          dataKey={xAxisKey}
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          interval={interval}
          angle={data.length > 18 ? -45 : 0}
          textAnchor={data.length > 18 ? "end" : "middle"}
          height={data.length > 18 ? 50 : 30}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "var(--radius)",
            fontSize: 12,
          }}
        />
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2}
          dot={{ fill: color, strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, strokeWidth: 0 }}
        />
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}

interface AreaChartProps {
  data: Array<Record<string, string | number>>;
  dataKey: string;
  xAxisKey?: string;
  height?: number;
  color?: string;
  xAxisInterval?: number | "preserveStart" | "preserveEnd" | "preserveStartEnd" | "equidistantPreserveStart";
}

export function AreaChart({
  data,
  dataKey,
  xAxisKey = "name",
  height = 300,
  color = COLORS.primary,
  xAxisInterval,
}: AreaChartProps) {
  const interval = xAxisInterval ?? (data.length > 12 ? Math.ceil(data.length / 8) - 1 : 0);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsAreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey={xAxisKey}
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          interval={interval}
          angle={data.length > 18 ? -45 : 0}
          textAnchor={data.length > 18 ? "end" : "middle"}
          height={data.length > 18 ? 50 : 30}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "var(--radius)",
            fontSize: 12,
          }}
        />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2}
          fill={color}
          fillOpacity={0.1}
        />
      </RechartsAreaChart>
    </ResponsiveContainer>
  );
}

interface BarChartProps {
  data: Array<Record<string, string | number>>;
  dataKey: string;
  xAxisKey?: string;
  height?: number;
  color?: string;
  horizontal?: boolean;
}

export function BarChart({
  data,
  dataKey,
  xAxisKey = "name",
  height = 300,
  color = COLORS.primary,
  horizontal = false,
}: BarChartProps) {
  if (horizontal) {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart data={data} layout="vertical" margin={{ top: 5, right: 10, left: 60, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={true} vertical={false} />
          <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis
            type="category"
            dataKey={xAxisKey}
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            width={55}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "var(--radius)",
              fontSize: 12,
            }}
          />
          <Bar dataKey={dataKey} fill={color} radius={[0, 4, 4, 0]} />
        </RechartsBarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey={xAxisKey}
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "var(--radius)",
            fontSize: 12,
          }}
        />
        <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}

interface PieChartProps {
  data: Array<{ name: string; value: number }>;
  height?: number;
  innerRadius?: number;
  showLegend?: boolean;
}

export function DonutChart({
  data,
  height = 300,
  innerRadius = 60,
  showLegend = true,
}: PieChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsPieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={80}
          paddingAngle={2}
          dataKey="value"
          labelLine={false}
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "var(--radius)",
            fontSize: 12,
          }}
        />
        {showLegend && (
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            iconSize={8}
            formatter={(value: string) => <span className="text-foreground text-xs">{value}</span>}
          />
        )}
      </RechartsPieChart>
    </ResponsiveContainer>
  );
}

// Export colors for external use
export { COLORS };
